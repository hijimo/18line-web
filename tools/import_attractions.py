#!/usr/bin/env python3
"""将 attractions.jsonl 中的景点数据通过API导入系统"""

import json
import sys
import time

import requests

API_BASE = "http://18line-admin.asyncb.com/api"


def login(username, password):
    resp = requests.post(f"{API_BASE}/login", json={
        "username": username,
        "password": password,
    })
    data = resp.json()
    if data.get("code") != 200:
        print(f"登录失败: {data}")
        sys.exit(1)
    token = data.get("token") or data.get("data", {}).get("token")
    print(f"登录成功，token: {token[:20]}...")
    return token


def add_attraction(token, record):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    # 添加provinceName/cityName/districtName字段映射（API可能不需要这些，但保留兼容）
    resp = requests.post(f"{API_BASE}/travel18/attraction/add", headers=headers, json=record)
    return resp.json()


def main():
    jsonl_file = "/Users/zhaojimo/Documents/git/18line-workspace/18line-web/tools/松阳县/attractions.jsonl"

    if len(sys.argv) > 1:
        jsonl_file = sys.argv[1]

    # 登录
    token = login("admin", "admin123")

    # 读取景点数据
    with open(jsonl_file, "r", encoding="utf-8") as f:
        records = [json.loads(line.strip()) for line in f if line.strip()]

    print(f"共 {len(records)} 个景点待导入")

    success = 0
    failed = 0

    for i, record in enumerate(records, 1):
        name = record.get("attractionName", "")
        result = add_attraction(token, record)

        if result.get("code") == 200:
            success += 1
            print(f"[{i}/{len(records)}] ✓ {name}")
        else:
            failed += 1
            print(f"[{i}/{len(records)}] ✗ {name} - {result.get('msg', result)}")

        time.sleep(0.1)

    print(f"\n导入完成: 成功 {success}, 失败 {failed}, 共 {len(records)}")


if __name__ == "__main__":
    main()
