#!/usr/bin/env python3
"""景点数据采集工具 - 从腾讯地图搜索景点，用AI生成描述和图片，输出JSONL文件"""

import argparse
import base64
import json
import logging
import math
import os
import random
import sys
import tempfile
import time
import uuid
from datetime import datetime
from urllib.parse import urlparse

import jellyfish
import oss2
import requests
from dotenv import load_dotenv
from openai import OpenAI

# ============================================================
# 常量
# ============================================================

KEYWORDS = [
    "景点", "旅游", "风景区", "古村", "古镇",
    "公园", "寺庙", "博物馆", "纪念馆",
    "古桥", "古道", "梯田", "廊桥",
    "红色景点", "革命遗址",
    "自然保护区", "湿地",
    "祠堂", "古建筑", "塔",
]

EXCLUDE_KEYWORDS = [
    "停车场", "游客中心", "售票处", "厕所", "酒店",
    "宾馆", "民宿", "餐厅", "饭店", "超市",
    "旅行社", "开发有限公司", "管理处", "派出所",
    "加油站", "卫生院", "银行", "药店",
    "公寓", "人民法院", "花圃", "批发",
]

# 允许的POI类目前缀（腾讯地图category字段）
ALLOWED_CATEGORIES = [
    "旅游景点",
    "文化场馆",
]

MAX_RETRIES = 3
RETRY_DELAYS = [2, 4, 8]

TIMEOUT_MAP = 10
TIMEOUT_AI = 60
TIMEOUT_IMAGE = 120
TIMEOUT_OSS = 30

IMAGE_DOMAIN_WHITELIST = [
    "volccdn.com",
    "volces.com",
    "byteimg.com",
    "tosv.byted.org",
]

# API调用计数器
api_counter = {
    "tencent_map": 0,
    "azure_openai": 0,
    "seedream": 0,
    "oss_upload": 0,
}

# ============================================================
# 工具函数
# ============================================================

def setup_logging(output_dir):
    log_file = os.path.join(output_dir, "run.log")
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def name_similarity(a, b):
    return jellyfish.jaro_winkler_similarity(a, b)


def is_valid_image_domain(url):
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return False
        return any(hostname.endswith(d) for d in IMAGE_DOMAIN_WHITELIST)
    except Exception:
        return False


# ============================================================
# 腾讯地图模块
# ============================================================

def search_pois(keyword, district_name, key, max_spots):
    results = []
    page_index = 1

    while True:
        if len(results) >= max_spots:
            break

        params = {
            "keyword": keyword,
            "boundary": f"region({district_name}, 0)",
            "page_size": 20,
            "page_index": page_index,
            "key": key,
        }

        for attempt in range(MAX_RETRIES):
            try:
                resp = requests.get(
                    "https://apis.map.qq.com/ws/place/v1/search",
                    params=params,
                    timeout=TIMEOUT_MAP,
                )
                api_counter["tencent_map"] += 1
                data = resp.json()
                break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAYS[attempt])
                else:
                    logging.warning(f"腾讯地图搜索失败 keyword={keyword} page={page_index}: {e}")
                    return results

        if data.get("status") != 0:
            logging.warning(f"腾讯地图返回错误: {data.get('message', '')} keyword={keyword}")
            break

        pois = data.get("data", [])
        if not pois:
            break

        for poi in pois:
            results.append({
                "id": poi.get("id", ""),
                "name": poi.get("title", ""),
                "lng": poi.get("location", {}).get("lng", 0),
                "lat": poi.get("location", {}).get("lat", 0),
                "category": poi.get("category", ""),
                "address": poi.get("address", ""),
            })

        if len(pois) < 20:
            break
        if page_index >= 10:
            break

        page_index += 1
        time.sleep(0.3)

    return results


def geocode_address(address, key):
    params = {
        "address": address,
        "key": key,
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                "https://apis.map.qq.com/ws/geocoder/v1/",
                params=params,
                timeout=TIMEOUT_MAP,
            )
            api_counter["tencent_map"] += 1
            data = resp.json()
            break
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
            else:
                logging.warning(f"地址解析失败: {address}: {e}")
                return None

    if data.get("status") != 0:
        return None

    location = data.get("result", {}).get("location", {})
    if location.get("lng") and location.get("lat"):
        return {"lng": location["lng"], "lat": location["lat"]}
    return None


def get_district_bbox(district_name, key):
    """通过搜索区域中心点，估算区域边界框（用于过滤越界结果）"""
    location = geocode_address(district_name, key)
    if not location:
        return None
    # 县级区域一般半径约20-30km，用0.25度（约28km）作为边界
    return {
        "min_lng": location["lng"] - 0.25,
        "max_lng": location["lng"] + 0.25,
        "min_lat": location["lat"] - 0.25,
        "max_lat": location["lat"] + 0.25,
    }


def is_in_bbox(poi, bbox):
    if not bbox:
        return True
    return (bbox["min_lng"] <= poi["lng"] <= bbox["max_lng"] and
            bbox["min_lat"] <= poi["lat"] <= bbox["max_lat"])


def collect_all_pois(district_name, key, max_spots):
    all_pois = []
    seen_ids = set()

    bbox = get_district_bbox(district_name, key)
    if bbox:
        logging.info(f"区域边界: lng[{bbox['min_lng']:.4f}, {bbox['max_lng']:.4f}] lat[{bbox['min_lat']:.4f}, {bbox['max_lat']:.4f}]")

    for keyword in KEYWORDS:
        if len(all_pois) >= max_spots:
            break

        logging.info(f"搜索关键词: {keyword}")
        pois = search_pois(keyword, district_name, key, max_spots)

        for poi in pois:
            if poi["id"] and poi["id"] not in seen_ids:
                if is_in_bbox(poi, bbox):
                    seen_ids.add(poi["id"])
                    all_pois.append(poi)

        time.sleep(0.3)

    return all_pois


# ============================================================
# 去重与过滤
# ============================================================

def filter_pois(pois):
    filtered = []
    for poi in pois:
        name = poi["name"]
        if not name:
            continue
        if any(kw in name for kw in EXCLUDE_KEYWORDS):
            continue
        category = poi.get("category", "")
        if category and not any(category.startswith(prefix) for prefix in ALLOWED_CATEGORIES):
            continue
        filtered.append(poi)
    return filtered


def deduplicate_pois(pois):
    result = []

    for poi in pois:
        is_dup = False
        for existing in result:
            if poi["name"] == existing["name"]:
                is_dup = True
                break
            dist = haversine_distance(poi["lat"], poi["lng"], existing["lat"], existing["lng"])
            sim = name_similarity(poi["name"], existing["name"])
            if dist < 100 and sim > 0.6:
                is_dup = True
                break
        if not is_dup:
            result.append(poi)

    return result


# ============================================================
# 手动补充景点
# ============================================================

def load_extra_spots(filepath):
    spots = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            spots.append(line)
    return spots


def resolve_extra_spots(spots, district_name, province_name, city_name, key):
    resolved = []
    for name in spots:
        logging.info(f"解析手动补充景点: {name}")
        pois = search_pois(name, district_name, key, max_spots=5)
        time.sleep(0.3)

        if pois:
            resolved.append(pois[0])
            continue

        address = f"{province_name}{city_name}{district_name}{name}"
        location = geocode_address(address, key)
        time.sleep(0.3)

        if location:
            resolved.append({
                "id": f"extra_{uuid.uuid4().hex[:8]}",
                "name": name,
                "lng": location["lng"],
                "lat": location["lat"],
                "category": "",
                "address": address,
            })
        else:
            logging.warning(f"无法解析景点坐标，跳过: {name}")

    return resolved


# ============================================================
# AI内容生成
# ============================================================

def get_openai_client():
    return OpenAI(
        base_url=os.getenv("AZURE_OPENAI_BASEURL"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    )


def generate_ai_content(client, attraction_name, province_name, city_name, district_name):
    model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4.1")

    prompt = f"""景点名称：{attraction_name}
所在区域：{province_name}{city_name}{district_name}

请生成以下JSON字段：
{{
  "attractionShortName": "景点简称（2-4字）",
  "attractionDescription": "一句话描述（15-30字，突出特色）",
  "attractionBlurb": "根据景点特色的谜语短句（4-6字，含蓄隐晦）",
  "attractionNotes": "注意事项（不确定则为空字符串）",
  "classicRating": "经典指数1-5（字符串）",
  "leisureRating": "休闲指数0-1（字符串，保留1位小数）",
  "visitDuration": "建议游玩小时数（字符串）",
  "openTime": "开放时间（不确定则为空字符串）",
  "bestViewingTime": "最佳观景时间（不确定则为空字符串）",
  "familyFriendly": "是否适合亲子游（'0'或'1'）",
  "ticketPriceA": "成人门票数字或null",
  "ticketPriceC": "儿童门票数字或null",
  "reservationRequired": "预约渠道（不确定则为空字符串）",
  "perCost": "人均消费（不确定则为空字符串）",
  "indoorOutdoor": "'室内'或'室外'或'室内外'"
}}

重要：对于不确定的信息，宁可留空也不要编造。"""

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "你是旅游信息专家。请严格按JSON格式输出。对于不确定的信息，使用空字符串而非编造。"},
                    {"role": "user", "content": prompt},
                ],
                timeout=TIMEOUT_AI,
            )
            api_counter["azure_openai"] += 1
            content = response.choices[0].message.content
            data = json.loads(content)
            return validate_ai_output(data)
        except Exception as e:
            api_counter["azure_openai"] += 1
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
            else:
                logging.warning(f"AI内容生成失败 {attraction_name}: {e}")
                return get_default_ai_output()

    return get_default_ai_output()


def validate_ai_output(data):
    defaults = get_default_ai_output()

    result = {}
    for key in defaults:
        result[key] = data.get(key, defaults[key])

    if result["classicRating"] not in ["1", "2", "3", "4", "5"]:
        result["classicRating"] = "3"

    try:
        val = float(result["leisureRating"])
        if not (0 <= val <= 1):
            result["leisureRating"] = "0.5"
        else:
            result["leisureRating"] = f"{val:.1f}"
    except (ValueError, TypeError):
        result["leisureRating"] = "0.5"

    if result["familyFriendly"] not in ["0", "1"]:
        result["familyFriendly"] = "0"

    for price_key in ["ticketPriceA", "ticketPriceC"]:
        v = result[price_key]
        if v is not None:
            try:
                result[price_key] = float(v)
            except (ValueError, TypeError):
                result[price_key] = None

    for str_key in ["attractionShortName", "attractionDescription", "attractionBlurb",
                    "attractionNotes", "openTime", "bestViewingTime",
                    "reservationRequired", "perCost", "indoorOutdoor", "visitDuration"]:
        if result[str_key] is None:
            result[str_key] = ""
        result[str_key] = str(result[str_key])

    return result


def get_default_ai_output():
    return {
        "attractionShortName": "",
        "attractionDescription": "",
        "attractionBlurb": "",
        "attractionNotes": "",
        "classicRating": "3",
        "leisureRating": "0.5",
        "visitDuration": "1",
        "openTime": "",
        "bestViewingTime": "",
        "familyFriendly": "0",
        "ticketPriceA": None,
        "ticketPriceC": None,
        "reservationRequired": "",
        "perCost": "",
        "indoorOutdoor": "",
    }


# ============================================================
# 图片生成
# ============================================================

IMAGE_PROMPTS = [
    "中国{area}{name}，风景摄影，高清，自然光，旅游宣传照片风格，真实感，细节丰富，全景视角",
    "中国{area}{name}，航拍俯瞰视角，高清风景摄影，自然光线，壮观大气",
    "中国{area}{name}，近景特写，建筑细节或自然纹理，柔和光线，文艺风格",
    "中国{area}{name}，黄昏日落时分，暖色调，光影交错，氛围感强烈",
    "中国{area}{name}，清晨薄雾，宁静悠远，水墨画意境，中国风",
]


def generate_image(attraction_name, province_name, city_name, district_name, prompt_template=None):
    ark_key = os.getenv("ARK_API_KEY")
    area = f"{province_name}{city_name}{district_name}"
    if prompt_template:
        prompt = prompt_template.format(area=area, name=attraction_name)
    else:
        prompt = f"中国{area}{attraction_name}，风景摄影，高清，自然光，旅游宣传照片风格，真实感，细节丰富"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ark_key}",
    }
    payload = {
        "model": "doubao-seedream-5-0-260128",
        "prompt": prompt,
        "sequential_image_generation": "disabled",
        "response_format": "url",
        "size": "1920x1920",
        "stream": False,
        "watermark": True,
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(
                "https://ark.cn-beijing.volces.com/api/v3/images/generations",
                headers=headers,
                json=payload,
                timeout=TIMEOUT_IMAGE,
            )
            api_counter["seedream"] += 1
            result = resp.json()

            if "data" not in result or not result["data"]:
                raise ValueError(f"Seedream返回无数据: {result}")

            item = result["data"][0]
            image_url = item.get("url")
            if image_url:
                return download_image(image_url)

            b64_data = item.get("b64_json")
            if b64_data:
                return base64.b64decode(b64_data)

            raise ValueError("Seedream返回既无url也无b64_json")

        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
            else:
                logging.warning(f"图片生成失败 {attraction_name}: {e}")
                return None

    return None


def download_image(url):
    if not is_valid_image_domain(url):
        logging.warning(f"图片URL域名不在白名单中: {url}，尝试直接下载")

    resp = requests.get(url, timeout=30)
    content_type = resp.headers.get("Content-Type", "")
    if not content_type.startswith("image/"):
        logging.warning(f"图片Content-Type异常: {content_type}")

    if len(resp.content) > 10 * 1024 * 1024:
        logging.warning(f"图片超过10MB限制，跳过")
        return None

    return resp.content


# ============================================================
# OSS上传
# ============================================================

def get_oss_bucket():
    auth = oss2.Auth(os.getenv("OSS_AK"), os.getenv("OSS_SK"))
    return oss2.Bucket(
        auth,
        f"https://{os.getenv('OSS_REGION')}.aliyuncs.com",
        os.getenv("OSS_BUCKET"),
    )


def upload_to_oss(bucket, image_data):
    now = datetime.now()
    file_key = f"travel18/attraction/{now.strftime('%Y/%m/%d')}/{uuid.uuid4()}.jpg"

    for attempt in range(MAX_RETRIES):
        try:
            bucket.put_object(
                file_key,
                image_data,
                headers={"Content-Type": "image/jpeg"},
            )
            api_counter["oss_upload"] += 1
            oss_bucket = os.getenv("OSS_BUCKET")
            oss_region = os.getenv("OSS_REGION")
            return f"https://{oss_bucket}.{oss_region}.aliyuncs.com/{file_key}"
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
            else:
                logging.warning(f"OSS上传失败: {e}")
                return None

    return None


# ============================================================
# 数据组装
# ============================================================

def build_attraction_json(poi, ai_data, oss_urls, codes):
    attachments = []
    for url in oss_urls:
        attachments.append({
            "uid": f"uc-upload-{int(time.time() * 1000)}-{random.randint(1000, 9999)}",
            "purpose": "detail",
            "progress": 0,
            "url": url,
            "tmpUrl": "",
            "status": "done",
        })

    return {
        "attractionName": poi["name"],
        "attractionShortName": ai_data.get("attractionShortName", ""),
        "attractionDescription": ai_data.get("attractionDescription", ""),
        "attractionBlurb": ai_data.get("attractionBlurb", ""),
        "province": codes["province"],
        "city": codes["city"],
        "district": codes["district"],
        "provinceName": codes["provinceName"],
        "cityName": codes["cityName"],
        "districtName": codes["districtName"],
        "longitude": poi["lng"],
        "latitude": poi["lat"],
        "attractionNotes": ai_data.get("attractionNotes", ""),
        "classicRating": ai_data.get("classicRating", "3"),
        "leisureRating": ai_data.get("leisureRating", "0.5"),
        "visitDuration": ai_data.get("visitDuration", "1"),
        "openTime": ai_data.get("openTime", ""),
        "bestViewingTime": ai_data.get("bestViewingTime", ""),
        "familyFriendly": ai_data.get("familyFriendly", "0"),
        "ticketPriceA": ai_data.get("ticketPriceA"),
        "ticketPriceC": ai_data.get("ticketPriceC"),
        "reservationRequired": ai_data.get("reservationRequired", ""),
        "perCost": ai_data.get("perCost", ""),
        "indoorOutdoor": ai_data.get("indoorOutdoor", ""),
        "attachments": attachments,
    }


# ============================================================
# 断点续传
# ============================================================

def load_progress(output_dir):
    progress_file = os.path.join(output_dir, "progress.json")
    if os.path.exists(progress_file):
        try:
            with open(progress_file, "r", encoding="utf-8") as f:
                return set(json.load(f).get("processed_ids", []))
        except (json.JSONDecodeError, KeyError):
            return set()
    return set()


def save_progress(output_dir, processed_ids):
    progress_file = os.path.join(output_dir, "progress.json")
    tmp_file = progress_file + ".tmp"
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump({"processed_ids": list(processed_ids)}, f, ensure_ascii=False)
    os.replace(tmp_file, progress_file)


# ============================================================
# 主流程
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="景点数据采集工具")
    parser.add_argument("--provinceName", required=True, help="省名称")
    parser.add_argument("--province", required=True, help="省编码")
    parser.add_argument("--cityName", required=True, help="市名称")
    parser.add_argument("--city", required=True, help="市编码")
    parser.add_argument("--districtName", required=True, help="区/县名称")
    parser.add_argument("--district", required=True, help="区/县编码")
    parser.add_argument("--extra-spots", help="手动补充景点列表文件路径")
    parser.add_argument("--max-spots", type=int, default=100, help="最大景点数量上限")
    parser.add_argument("--dry-run", action="store_true", help="仅搜索景点列表，不生成AI内容和图片")
    args = parser.parse_args()

    load_dotenv()

    required_env = ["TENCENT_MAP_KEY"]
    if not args.dry_run:
        required_env.extend(["AZURE_OPENAI_BASEURL", "AZURE_OPENAI_API_KEY", "ARK_API_KEY", "OSS_AK", "OSS_SK", "OSS_BUCKET", "OSS_REGION"])
    for env_var in required_env:
        if not os.getenv(env_var):
            print(f"错误: 缺少环境变量 {env_var}，请配置 .env 文件")
            sys.exit(1)

    output_dir = os.path.join(".", args.districtName)
    os.makedirs(output_dir, exist_ok=True)
    setup_logging(output_dir)

    codes = {
        "province": args.province,
        "city": args.city,
        "district": args.district,
        "provinceName": args.provinceName,
        "cityName": args.cityName,
        "districtName": args.districtName,
    }

    start_time = time.time()
    logging.info(f"开始采集: {args.provinceName}{args.cityName}{args.districtName}")

    # 1. 搜索景点
    key = os.getenv("TENCENT_MAP_KEY")
    logging.info("正在从腾讯地图搜索景点...")
    all_pois = collect_all_pois(args.districtName, key, args.max_spots)
    logging.info(f"搜索到 {len(all_pois)} 个原始POI")

    # 2. 手动补充
    if args.extra_spots and os.path.exists(args.extra_spots):
        extra_names = load_extra_spots(args.extra_spots)
        logging.info(f"加载手动补充景点 {len(extra_names)} 个")
        extra_pois = resolve_extra_spots(extra_names, args.districtName, args.provinceName, args.cityName, key)
        all_pois.extend(extra_pois)
        logging.info(f"合并后共 {len(all_pois)} 个POI")

    # 3. 过滤+去重
    all_pois = filter_pois(all_pois)
    logging.info(f"过滤后: {len(all_pois)} 个")
    all_pois = deduplicate_pois(all_pois)
    logging.info(f"去重后: {len(all_pois)} 个景点")

    # 限制上限
    if len(all_pois) > args.max_spots:
        all_pois = all_pois[:args.max_spots]
        logging.info(f"截断到上限: {args.max_spots} 个")

    # dry-run模式
    if args.dry_run:
        logging.info("=== dry-run 模式，仅输出景点列表 ===")
        for i, poi in enumerate(all_pois, 1):
            logging.info(f"  {i}. {poi['name']} ({poi['lng']:.6f}, {poi['lat']:.6f}) [{poi['category']}]")
        logging.info(f"共 {len(all_pois)} 个景点")
        print_stats(start_time)
        return

    # 4. 逐个处理景点
    processed_ids = load_progress(output_dir)
    jsonl_file = os.path.join(output_dir, "attractions.jsonl")
    openai_client = get_openai_client()
    oss_bucket = get_oss_bucket()

    # 加载已有的JSONL数据（用于补图）
    existing_records = {}
    if os.path.exists(jsonl_file):
        with open(jsonl_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    record = json.loads(line)
                    existing_records[record["attractionName"]] = record

    MIN_IMAGES = 5
    new_records = {}

    for i, poi in enumerate(all_pois, 1):
        poi_id = poi["id"] or poi["name"]
        poi_name = poi["name"]

        # 检查总运行时间
        if time.time() - start_time > 180 * 60:
            logging.warning("运行超过180分钟，自动停止")
            break

        # 检查API调用总量
        total_calls = sum(api_counter.values())
        if total_calls >= 2000:
            logging.warning("API调用总量达到2000次上限，自动停止")
            break

        # 判断是否需要处理
        existing = existing_records.get(poi_name)
        if existing:
            current_images = len(existing.get("attachments", []))
            if current_images >= MIN_IMAGES:
                logging.info(f"[{i}/{len(all_pois)}] 跳过（已有{current_images}张图）: {poi_name}")
                continue
            # 需要补图
            images_needed = MIN_IMAGES - current_images
            logging.info(f"[{i}/{len(all_pois)}] 补图({current_images}→{MIN_IMAGES}): {poi_name}")
            oss_urls = [att["url"] for att in existing.get("attachments", [])]
            ai_data = {k: existing[k] for k in get_default_ai_output().keys() if k in existing}
        elif poi_id in processed_ids and poi_name not in existing_records:
            # 在progress中但不在jsonl中（异常情况），重新处理
            images_needed = MIN_IMAGES
            logging.info(f"[{i}/{len(all_pois)}] 处理: {poi_name}")
            ai_data = None
            oss_urls = []
        else:
            images_needed = MIN_IMAGES
            logging.info(f"[{i}/{len(all_pois)}] 处理: {poi_name}")
            ai_data = None
            oss_urls = []

        # AI内容生成（仅新景点需要）
        if ai_data is None:
            ai_data = generate_ai_content(
                openai_client, poi_name,
                args.provinceName, args.cityName, args.districtName,
            )

        # 图片生成+上传（生成所需数量的图片）
        start_idx = MIN_IMAGES - images_needed
        for img_idx in range(images_needed):
            prompt_idx = start_idx + img_idx
            prompt_template = IMAGE_PROMPTS[prompt_idx % len(IMAGE_PROMPTS)]
            image_data = generate_image(poi_name, args.provinceName, args.cityName, args.districtName, prompt_template)
            time.sleep(2)

            if image_data:
                url = upload_to_oss(oss_bucket, image_data)
                if url:
                    oss_urls.append(url)

        # 组装JSON
        record = build_attraction_json(poi, ai_data, oss_urls, codes)
        new_records[poi_name] = record

        # 更新进度
        processed_ids.add(poi_id)
        save_progress(output_dir, processed_ids)

        logging.info(f"  完成: {poi_name} (图片={len(oss_urls)}张)")

    # 重写JSONL文件（合并已有+新处理的）
    if new_records:
        # 合并：新记录覆盖旧记录
        for name, record in new_records.items():
            existing_records[name] = record

        # 按原始POI顺序写入
        tmp_jsonl = jsonl_file + ".tmp"
        with open(tmp_jsonl, "w", encoding="utf-8") as f:
            for poi in all_pois:
                if poi["name"] in existing_records:
                    f.write(json.dumps(existing_records[poi["name"]], ensure_ascii=False) + "\n")
        os.replace(tmp_jsonl, jsonl_file)
        logging.info(f"JSONL文件已更新，共 {len(existing_records)} 条记录")

    print_stats(start_time)


def print_stats(start_time):
    elapsed = time.time() - start_time
    logging.info("=== 运行统计 ===")
    logging.info(f"腾讯地图API调用: {api_counter['tencent_map']}次")
    logging.info(f"Azure OpenAI调用: {api_counter['azure_openai']}次")
    logging.info(f"Seedream调用: {api_counter['seedream']}次")
    logging.info(f"OSS上传: {api_counter['oss_upload']}次")
    logging.info(f"总耗时: {elapsed / 60:.1f}分钟")


if __name__ == "__main__":
    main()
