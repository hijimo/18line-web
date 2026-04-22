# travel18-core 数据库表设计

## 一、景点管理 (travel_attraction)

| 字段名                    | 类型            | 说明                                                                                           | 约束       |
|------------------------|---------------|:---------------------------------------------------------------------------------------------|----------|
| attraction_id          | bigint(20)    | 景点ID                                                                                         | 主键，自增    |
| attraction_name        | varchar(200)  | 景点名称                                                                                         | NOT NULL |
| attraction_short_name  | varchar(50)   | 景点简称                                                                                         |          |
| attraction_description | varchar(2000) | 景点描述                                                                                         |          |
| attraction_blurb       | varchar(500)  | 景点简介                                                                                         |          |
| province               | varchar(50)   | 省                                                                                            |          |
| city                   | varchar(50)   | 市                                                                                            |          |
| district               | varchar(50)   | 区县                                                                                           |          |
| longitude              | decimal(10,7) | 经度                                                                                           |          |
| latitude               | decimal(10,7) | 纬度                                                                                           |          |
| attraction_notes       | varchar(500)  | 注意事项                                                                                         |          |
| blind_status           | varchar(4)    | 是否全盲；0否 1是                                                                                   |          |
| classic_rating         | varchar(4)    | 经典指数 1-10星;数字1为1星，同理10为10星;                                                                  |          |
| leisure_rating         | varchar(4)    | 休闲指数 :0-5； 0轻松 1休闲 2中强度(正常?) 3高强度 4暴虐强度;在sys_dict_type中对应travel_leisure字段的映射关系    |          |
| visit_duration         | varchar(10)   | 游玩时间                                                                                         |          |
| open_time              | varchar(100)  | 开放时间                                                                                         |          |
| family_friendly        | varchar(4)    | 亲子游属性;0否 1是                                                                                  |          |
| ticket_price_a         | decimal(10,2) | 门票价格成人                                                                                       |          |
| ticket_price_c         | decimal(10,2) | 门票价格儿童                                                                                       |          |
| reservation_required   | varchar(50)   | 提前预约；预约渠道                                                                                    |          |
| per_cost               | varchar(10)   | 人均消费                                                                                         |          |
| indoor_outdoor         | varchar(10)   | 室内 / 室外                                                                                      |          |
| closed_day             | varchar(20)   | 固定闭馆 / 关闭日期（如周一）                                                                             |          |
| special_period         | varchar(20)   | 特定开放 / 关闭时间段                                                                                 |          |
| bad_factors            | varchar(4)    | 不宜出行因素; 在sys_dict_type中对应travel_bad_factors字段的映射关系,sys_dict_data中加入0高温、1暴雨、2冰冻、3心脏病、4高血压、5恐高 |          |
| status                 | varchar(4)    | 状态(0正常1停用)                                                                                   | 默认'0'    |
| del_flag               | varchar(4)    | 删除标志                                                                                         | 默认'0'    |
| 公共字段                   |               | create_by, create_time, update_by, update_time, remark                                       |          |

## 二、打卡点管理 (travel_checkin)

| 字段名                  | 类型            | 说明                                                     | 约束       |
|----------------------|---------------|:-------------------------------------------------------|----------|
| checkin_id           | bigint(20)    | 打卡点ID                                                  | 主键，自增    |
| attraction_id        | bigint(20)    | 关联景点ID                                                 | NOT NULL |
| checkin_name         | varchar(200)  | 打卡点名称                                                  | NOT NULL |
| checkin_short_name   | varchar(50)   | 打卡点简称                                                  |          |
| checkin_description  | varchar(2000) | 打卡点描述                                                  |          |
| checkin_blurb        | varchar(500)  | 打卡点简介                                                  |          |
| province             | varchar(50)   | 省                                                      |          |
| city                 | varchar(50)   | 市                                                      |          |
| district             | varchar(50)   | 区县                                                     |          |
| longitude            | decimal(10,7) | 经度                                                     |          |
| latitude             | decimal(10,7) | 纬度                                                     |          |
| checkin_notes        | varchar(500)  | 注意事项                                                   |          |
| blind_status         | varchar(4)    | 是否全盲；0否 1是                                             |          |
| classic_rating       | varchar(4)    | 经典指数 1-10星                                             |          |
| leisure_rating       | varchar(4)    | 休闲指数 :0-5                                              |          |
| visit_duration       | varchar(10)   | 游玩时间                                                   |          |
| open_time            | varchar(100)  | 开放时间                                                   |          |
| family_friendly      | varchar(4)    | 亲子游属性;0否 1是                                            |          |
| ticket_price_a       | decimal(10,2) | 门票价格成人                                                 |          |
| ticket_price_c       | decimal(10,2) | 门票价格儿童                                                 |          |
| reservation_required | varchar(50)   | 提前预约；预约渠道                                              |          |
| per_cost             | varchar(10)   | 人均消费                                                   |          |
| indoor_outdoor       | varchar(10)   | 室内 / 室外                                                |          |
| closed_day           | varchar(20)   | 固定闭馆 / 关闭日期（如周一）                                       |          |
| special_period       | varchar(20)   | 特定开放 / 关闭时间段                                           |          |
| bad_factors          | varchar(4)    | 不宜出行因素                                                 |          |
| sort_order           | int(11)       | 排序序号                                                   | 默认0      |
| status               | varchar(4)    | 状态(0正常1停用)                                             | 默认'0'    |
| del_flag             | varchar(4)    | 删除标志                                                   | 默认'0'    |
| 公共字段                 |               | create_by, create_time, update_by, update_time, remark |          |

## 三、线路管理 (travel_line)

| 字段名                  | 类型            | 说明                                                     | 约束       |
|----------------------|---------------|:-------------------------------------------------------|----------|
| line_id              | bigint(20)    | 线路ID                                                  | 主键，自增    |
| line_name            | varchar(200)  | 线路名称                                                  | NOT NULL |
| province             | varchar(50)   | 省                                                      |          |
| city                 | varchar(50)   | 市                                                      |          |
| district             | varchar(50)   | 区县                                                     |          |
| status               | varchar(4)    | 状态(0正常1停用)                                             | 默认'0'    |
| del_flag             | varchar(4)    | 删除标志                                                   | 默认'0'    |
| 公共字段                 |               | create_by, create_time, update_by, update_time, remark |          |

## 四、线路景点关联 (travel_line_attraction)

| 字段名                  | 类型            | 说明                                                     | 约束       |
|----------------------|---------------|:-------------------------------------------------------|----------|
| line_id              | bigint(20)    | 线路ID                                                  | NOT NULL |
| attraction_id        | bigint(20)    | 景点ID                                                  | NOT NULL |
| PRIMARY KEY (line_id, attraction_id) | | 联合主键                                                 |          |

## 五、住宿管理 (travel_accommodation)

| 字段名                | 类型            | 说明                                                     | 约束       |
|----------------------|---------------|:-------------------------------------------------------|----------|
| accommodation_id     | bigint(20)    | 住宿ID                                                  | 主键，自增    |
| accommodation_name   | varchar(200)  | 酒店名称                                                 | NOT NULL |
| accommodation_desc   | varchar(2000) | 描述                                                    |          |
| contact_phone        | varchar(20)   | 联系电话                                                 |          |
| province             | varchar(50)   | 省                                                      |          |
| city                 | varchar(50)   | 市                                                      |          |
| district             | varchar(50)   | 区                                                     |          |
| address              | varchar(300)  | 详细地址                                                 |          |
| longitude            | decimal(10,7) | 经度                                                    |          |
| latitude             | decimal(10,7) | 纬度                                                    |          |
| accommodation_type   | char(1)       | 住宿类型(0酒店 1民宿)                                      | 默认'0'    |
| breakfast_included   | char(1)       | 含早餐(0否 1是)                                           | 默认'0'    |
| pet_friendly         | char(1)       | 宠物友好(0否 1是)                                          | 默认'0'    |
| price_min            | decimal(10,2) | 最低价格                                                 |          |
| price_max            | decimal(10,2) | 最高价格                                                 |          |
| status               | char(1)       | 状态(0正常1停用)                                           | 默认'0'    |
| del_flag             | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段               |               | create_by, create_time, update_by, update_time, remark |          |

## 六、餐饮管理 (travel_dining)

| 字段名              | 类型            | 说明                                                     | 约束       |
|--------------------|---------------|:-------------------------------------------------------|----------|
| dining_id          | bigint(20)    | 餐饮ID                                                  | 主键，自增    |
| dining_name        | varchar(200)  | 名称                                                    | NOT NULL |
| dining_desc        | varchar(2000) | 描述                                                    |          |
| dining_tips        | varchar(500)  | Tips(如每周三休息)                                          |          |
| province           | varchar(50)   | 省                                                      |          |
| city               | varchar(50)   | 市                                                      |          |
| district           | varchar(50)   | 区                                                     |          |
| address            | varchar(300)  | 详细地址                                                 |          |
| longitude          | decimal(10,7) | 经度                                                    |          |
| latitude           | decimal(10,7) | 纬度                                                    |          |
| pet_friendly       | char(1)       | 宠物友好(0否 1是)                                          | 默认'0'    |
| dining_nature      | char(1)       | 性质(0早餐 1正餐 2宵夜 3其他)                                | 默认'0'    |
| avg_cost           | decimal(10,2) | 人均消费                                                 |          |
| recommend_rating   | int(11)       | 推荐指数(0-10)                                            |          |
| parking_available  | char(1)       | 停车位(0否 1是)                                           | 默认'0'    |
| status             | char(1)       | 状态(0正常1停用)                                           | 默认'0'    |
| del_flag           | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段             |               | create_by, create_time, update_by, update_time, remark |          |

## 七、跟拍管理 (travel_photography)

| 字段名            | 类型            | 说明                                                     | 约束       |
|------------------|---------------|:-------------------------------------------------------|----------|
| photography_id   | bigint(20)    | 跟拍ID                                                  | 主键，自增    |
| nickname         | varchar(50)   | 昵称                                                    | NOT NULL |
| gender           | char(1)       | 性别(0男 1女 2未知)                                       | 默认'0'    |
| introduction     | varchar(2000) | 简介                                                    |          |
| contact_info     | varchar(100)  | 联系方式                                                 |          |
| price            | decimal(10,2) | 价格                                                    |          |
| recommend_rating | int(11)       | 推荐指数(0-5)                                            |          |
| equipment        | varchar(500)  | 设备                                                    |          |
| status           | char(1)       | 状态(0正常1停用)                                           | 默认'0'    |
| del_flag         | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段           |               | create_by, create_time, update_by, update_time, remark |          |

## 八、包车管理 (travel_car)

| 字段名          | 类型            | 说明                                                     | 约束       |
|----------------|---------------|:-------------------------------------------------------|----------|
| car_id         | bigint(20)    | 包车ID                                                  | 主键，自增    |
| nickname       | varchar(50)   | 昵称                                                    | NOT NULL |
| gender         | char(1)       | 性别(0男 1女 2未知)                                       | 默认'0'    |
| introduction   | varchar(2000) | 简介                                                    |          |
| contact_info   | varchar(100)  | 联系方式                                                 |          |
| price          | decimal(10,2) | 价格                                                    |          |
| car_model      | varchar(100)  | 车型                                                    |          |
| seat_count     | int(11)       | 座位数                                                  |          |
| driving_years  | int(11)       | 驾龄(年)                                                |          |
| status         | char(1)       | 状态(0正常1停用)                                           | 默认'0'    |
| del_flag       | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段         |               | create_by, create_time, update_by, update_time, remark |          |

## 九、菜品管理 (travel_dish)

| 字段名          | 类型            | 说明                                                     | 约束       |
|----------------|---------------|:-------------------------------------------------------|----------|
| dish_id        | bigint(20)    | 菜品ID                                                  | 主键，自增    |
| dining_id      | bigint(20)    | 餐饮ID                                                  | NOT NULL |
| dish_name      | varchar(100)  | 菜品名称                                                 | NOT NULL |
| dish_desc      | varchar(500)  | 描述                                                    |          |
| special_star   | int(1)        | 特色星级(1-5星)                                           |          |
| dark_level     | varchar(20)   | 黑暗程度(special_dark=特黑,light_dark=浅黑,normal=正常)        |          |
| price          | decimal(10,2) | 价格                                                    |          |
| seasonal       | char(1)       | 时令菜(0否 1是)                                           | 默认'0'    |
| reservation    | char(1)       | 提前预约(0否 1是)                                         | 默认'0'    |
| status         | char(1)       | 状态(0正常1停用)                                           | 默认'0'    |
| del_flag       | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段         |               | create_by, create_time, update_by, update_time, remark |          |

## 十、游客管理 (travel_tourist)

| 字段名         | 类型           | 说明                                   | 约束        |
|---------------|---------------|----------------------------------------|------------|
| tourist_id    | bigint        | 游客ID                                  | PK, 自增    |
| openid        | varchar(64)   | 微信小程序openId                        | 唯一索引     |
| unionid       | varchar(64)   | 微信unionId（多端预留）                   |             |
| session_key   | varchar(128)  | 微信sessionKey                          |             |
| nickname      | varchar(64)   | 昵称                                    |             |
| avatar_url    | varchar(512)  | 头像URL                                 |             |
| gender        | char(1)       | 性别(0未知 1男 2女)                      | 默认'0'     |
| phone         | varchar(20)   | 手机号                                  |             |
| real_name     | varchar(64)   | 真实姓名                                |             |
| id_card       | varchar(20)   | 身份证号                                |             |
| status        | char(1)       | 状态(0正常 1停用)                        | 默认'0'     |
| del_flag      | char(1)       | 删除标志                                | 默认'0'     |
| login_ip      | varchar(128)  | 最后登录IP                              |             |
| login_date    | datetime      | 最后登录时间                             |             |
| 公共字段        |               | create_by, create_time, update_by, update_time, remark |             |

## 十一、游客喜好 (travel_tourist_preference)

| 字段名          | 类型           | 说明                                       | 约束        |
|----------------|---------------|--------------------------------------------|------------|
| preference_id  | bigint(20)    | 喜好ID                                     | PK, 自增    |
| tourist_id     | bigint(20)    | 游客ID                                     | NOT NULL, 普通索引 |
| trip_id        | bigint(20)    | 行程ID（预留）                              | 普通索引     |
| gender         | char(1)       | 性别(0未知 1男 2女)                         | 默认'0'     |
| birth_year     | int(4)        | 出生年份                                   |             |
| stamina        | char(1)       | 体力(0有点弱 1一般般 2精力充沛 3运动员级)      | 默认'0'     |
| travel_likes   | varchar(100)  | 旅游喜好（多选逗号分隔，关联字典travel_tourist_like） |  |
| food_likes     | varchar(100)  | 美食喜好（多选逗号分隔，关联字典travel_food_like）   |  |
| stay_pref      | varchar(20)   | 住宿倾向（多选逗号分隔，关联字典travel_stay_pref）   |  |
| health_tags    | varchar(50)   | 健康标签（多选逗号分隔，关联字典travel_health_tag）  |  |
| status         | char(1)       | 状态(0正常 1停用)                           | 默认'0'     |
| del_flag       | char(1)       | 删除标志                                   | 默认'0'     |
| 公共字段        |               | create_by, create_time, update_by, update_time, remark |             |

## 十二、行程模板表 (travel_template)

| 字段名                | 类型            | 说明                                                     | 约束       |
|----------------------|---------------|:-------------------------------------------------------|----------|
| template_id          | bigint(20)    | 模板ID                                                  | 主键，自增    |
| template_name        | varchar(200)  | 模板名称                                                 | NOT NULL |
| template_desc        | varchar(500)  | 模板描述                                                 |          |
| province             | varchar(50)   | 省                                                      |          |
| city                 | varchar(50)   | 市                                                      |          |
| district             | varchar(50)   | 区                                                      |          |
| base_days            | int(11)       | 基准天数                                                 |          |
| min_days             | int(11)       | 最少天数                                                 |          |
| max_days             | int(11)       | 最大天数                                                 |          |
| stamina_level        | char(1)       | 推荐体力等级(0-3)                                          | 默认'1'    |
| travel_tags          | varchar(100)  | 旅行标签(多选逗号分隔)                                        |          |
| include_photography  | char(1)       | 包含跟拍(0否 1是)                                          | 默认'0'    |
| include_car          | char(1)       | 包含包车(0否 1是)                                          | 默认'0'    |
| version              | int(11)       | 版本号                                                  | 默认1      |
| status               | char(1)       | 状态(0正常 1停用)                                           | 默认'0'    |
| del_flag             | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段               |               | create_by, create_time, update_by, update_time, remark |          |

## 十三、模板日程表 (travel_template_day)

| 字段名                | 类型            | 说明                                                     | 约束       |
|----------------------|---------------|:-------------------------------------------------------|----------|
| template_day_id      | bigint(20)    | 模板日程ID                                               | 主键，自增    |
| template_id          | bigint(20)    | 模板ID                                                  | NOT NULL |
| day_number           | int(11)       | 第几天                                                  | NOT NULL |
| day_theme            | varchar(50)   | 当天主题                                                 |          |
| attraction_ids       | varchar(500)  | 固定景点ID列表(逗号分隔)                                      |          |
| attraction_criteria  | varchar(1000) | 动态景点筛选条件(JSON)                                      |          |
| leisure_min          | int(11)       | 最低休闲指数                                              |          |
| leisure_max          | int(11)       | 最高休闲指数                                              |          |
| accommodation_id     | bigint(20)    | 住宿ID                                                  |          |
| breakfast_dining_id  | bigint(20)    | 早餐餐饮ID                                               |          |
| lunch_dining_id      | bigint(20)    | 午餐餐饮ID                                               |          |
| dinner_dining_id     | bigint(20)    | 晚餐餐饮ID                                               |          |
| photography_id       | bigint(20)    | 跟拍ID                                                  |          |
| car_id               | bigint(20)    | 包车ID                                                  |          |
| status               | char(1)       | 状态(0正常 1停用)                                           | 默认'0'    |
| del_flag             | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段               |               | create_by, create_time, update_by, update_time, remark |          |

## 十四、行程表 (travel_itinerary)

| 字段名                | 类型            | 说明                                                     | 约束       |
|----------------------|---------------|:-------------------------------------------------------|----------|
| itinerary_id         | bigint(20)    | 行程ID                                                  | 主键，自增    |
| tourist_id           | bigint(20)    | 游客ID                                                  | NOT NULL |
| template_id          | bigint(20)    | 来源模板ID                                               |          |
| template_day_ids     | varchar(500)  | 使用的模板日程ID列表                                         |          |
| itinerary_name       | varchar(200)  | 行程名称                                                 | NOT NULL |
| province             | varchar(50)   | 省                                                      |          |
| city                 | varchar(50)   | 市                                                      |          |
| district             | varchar(50)   | 区                                                      |          |
| start_date           | date          | 开始日期                                                 |          |
| days                 | int(11)       | 总天数                                                  | NOT NULL |
| status               | char(1)       | 状态(0草稿 1已确认 2已完成 3已取消)                              | 默认'0'    |
| create_from          | char(1)       | 创建方式(1复制 2确认生成 3一键生成)                              | 默认'1'    |
| version              | int(11)       | 模板版本号                                               | 默认1      |
| total_cost           | decimal(12,2) | 预估总费用                                               |          |
| remark               | varchar(500)  | 备注                                                    |          |
| del_flag             | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段               |               | create_by, create_time, update_by, update_time          |          |

## 十五、行程日程明细表 (travel_itinerary_day)

| 字段名                   | 类型            | 说明                                                     | 约束       |
|-----------------------|---------------|:-------------------------------------------------------|----------|
| itinerary_day_id      | bigint(20)    | 行程日程ID                                               | 主键，自增    |
| itinerary_id          | bigint(20)    | 行程ID                                                  | NOT NULL |
| template_day_id       | bigint(20)    | 原始模板日程ID                                            |          |
| day_number            | int(11)       | 第几天                                                  | NOT NULL |
| day_theme             | varchar(50)   | 当天主题                                                 |          |
| attraction_ids        | varchar(500)  | 系统推荐景点ID列表                                          |          |
| attraction_criteria   | varchar(1000) | 推荐时的筛选条件                                           |          |
| tourist_attraction_ids| varchar(500)  | 游客调整后的景点                                           |          |
| accommodation_id      | bigint(20)    | 系统推荐住宿                                              |          |
| tourist_accommodation_id| bigint(20)  | 游客自选住宿                                              |          |
| breakfast_id          | bigint(20)    | 早餐                                                    |          |
| tourist_breakfast_id  | bigint(20)    | 游客自选早餐                                              |          |
| lunch_id              | bigint(20)    | 午餐                                                    |          |
| tourist_lunch_id       | bigint(20)    | 游客自选午餐                                              |          |
| dinner_id             | bigint(20)    | 晚餐                                                    |          |
| tourist_dinner_id     | bigint(20)    | 游客自选晚餐                                              |          |
| photography_id        | bigint(20)    | 跟拍预约                                                |          |
| tourist_photography_id | bigint(20)    | 游客自选跟拍                                              |          |
| car_id                | bigint(20)    | 包车预约                                                |          |
| tourist_car_id        | bigint(20)    | 游客自选包车                                              |          |
| del_flag              | char(1)       | 删除标志                                                 | 默认'0'    |
| 公共字段                 |               | create_by, create_time, update_by, update_time, remark |          |

## 十六、算法配置表 (travel_algorithm_config)

| 字段名                    | 类型            | 说明                                                     | 约束       |
|------------------------|---------------|:-------------------------------------------------------|----------|
| config_id              | bigint(20)    | 配置ID                                                  | 主键，自增    |
| region_code            | varchar(50)   | 行政区划代码（空=全国通用）                                      |          |
| region_name            | varchar(200)  | 行政区划名称                                                |          |
| region_level           | char(1)       | 区域级别（0全国 1省 2市 3区县）                                  | 默认'0'   |
| version                | int(11)       | 版本号                                                  | 默认1     |
| status                 | char(1)       | 状态（0正常 1停用）                                           | 默认'0'   |
| del_flag               | char(1)       | 删除标志（0存在 1删除）                                        | 默认'0'   |
| stamina_limit_0        | int(11)       | 体力等级0日耗上限（分钟）                                        | 默认150   |
| stamina_limit_1        | int(11)       | 体力等级1日耗上限（分钟）                                        | 默认240   |
| stamina_limit_2        | int(11)       | 体力等级2日耗上限（分钟）                                        | 默认360   |
| stamina_limit_3        | int(11)       | 体力等级3日耗上限（分钟），-1=不限                                 | 默认-1    |
| recovery_start_day     | int(11)       | 恢复起始天数                                               | 默认3     |
| recovery_threshold     | int(11)       | 恢复触发阈值（分钟）                                           | 默认480   |
| recovery_limit_26_35   | int(11)       | 26-35岁恢复上限（分钟）                                        | 默认240   |
| recovery_limit_36_50   | int(11)       | 36-50岁恢复上限（分钟）                                        | 默认180   |
| recovery_limit_51_plus | int(11)       | 51+岁恢复上限（分钟）                                          | 默认150   |
| single_attraction_threshold | int(11) | 单景点≥240阈值（分钟）                                    | 默认240   |
| stamina_formula_coefficient | decimal(5,2) | 体耗公式系数                                        | 默认1.00  |
| period_limit_morning   | int(11)       | 上午时段体耗上限（分钟）                                         | 默认180   |
| period_limit_afternoon | int(11)       | 下午时段体耗上限（分钟）                                         | 默认180   |
| period_limit_evening   | int(11)       | 晚上时段体耗上限（分钟）                                         | 默认180   |
| 公共字段                   |               | create_by, create_time, update_by, update_time, remark |          |

## 十七、算法配置历史表 (travel_algorithm_config_history)

| 字段名                  | 类型            | 说明                                                     | 约束       |
|----------------------|---------------|:-------------------------------------------------------|----------|
| history_id           | bigint(20)    | 历史ID                                                  | 主键，自增    |
| config_id            | bigint(20)    | 原配置ID                                                |          |
| region_code          | varchar(50)   | 行政区划代码                                                |          |
| region_name          | varchar(200)  | 行政区划名称                                                |          |
| version              | int(11)       | 操作后的版本号                                             |          |
| operation            | varchar(20)   | 操作类型（INSERT/UPDATE/DELETE）                              |          |
| old_config_snapshot  | text          | 变更前的完整配置（JSON）                                      |          |
| new_config_snapshot  | text          | 变更后的完整配置（JSON）                                      |          |
| operate_time         | datetime      | 操作时间                                                |          |
| operate_by           | varchar(64)   | 操作人                                                  |          |
| 公共字段                 |               | create_by, create_time                                  |          |

## 十八、统一资源附件表 (travel_resource)

| 字段名             | 类型           | 说明                                                        | 约束       |
|-------------------|---------------|:------------------------------------------------------------|----------|
| resource_id       | bigint(20)    | 资源ID                                                      | 主键，自增    |
| biz_type          | varchar(30)   | 业务类型(attraction/checkin/accommodation/dining/car/photography/dish/template) | NOT NULL |
| biz_id            | bigint(20)    | 业务实体ID                                                   | NOT NULL |
| resource_type     | varchar(20)   | 文件类型(image/video/audio/document)                        | NOT NULL |
| resource_purpose  | varchar(30)   | 用途(cover/banner/detail/guide/manual/menu/other)           |          |
| file_name         | varchar(200)  | 原始文件名                                                   |          |
| file_url          | varchar(500)  | 文件存储URL                                                  | NOT NULL |
| file_size         | bigint(20)    | 文件大小(字节)                                               |          |
| mime_type         | varchar(100)  | MIME类型                                                    |          |
| file_ext          | varchar(10)   | 文件扩展名                                                   |          |
| sort_order        | int(11)       | 排序序号                                                     | 默认0      |
| status            | char(1)       | 状态(0正常 1停用)                                             | 默认'0'    |
| del_flag          | char(1)       | 删除标志                                                    | 默认'0'    |
| 公共字段           |               | create_by, create_time, update_by, update_time, remark      |          |
