/** 通用状态：0正常 1停用 */
export const StatusEnum = {
  NORMAL: '0',
  DISABLED: '1',
} as const
export type Status = (typeof StatusEnum)[keyof typeof StatusEnum]

export const StatusLabel = {
  [StatusEnum.NORMAL]: '上架',
  [StatusEnum.DISABLED]: '下架',
} as const

/** 删除标志：0存在 1删除 */
export const DelFlagEnum = {
  EXISTS: '0',
  DELETED: '1',
} as const

/** 是否(0否 1是) — 通用布尔型枚举 */
export const YesNoEnum = {
  NO: '0',
  YES: '1',
} as const
export type YesNo = (typeof YesNoEnum)[keyof typeof YesNoEnum]

export const YesNoLabel = {
  [YesNoEnum.NO]: '否',
  [YesNoEnum.YES]: '是',
} as const

/** 性别(0男 1女 2未知) — 跟拍/包车 */
export const GenderEnum = {
  MALE: '0',
  FEMALE: '1',
  UNKNOWN: '2',
} as const
export type Gender = (typeof GenderEnum)[keyof typeof GenderEnum]

export const GenderLabel = {
  [GenderEnum.MALE]: '男',
  [GenderEnum.FEMALE]: '女',
  [GenderEnum.UNKNOWN]: '未知',
} as const

/** 性别(0未知 1男 2女) — 游客 */
export const TouristGenderEnum = {
  UNKNOWN: '0',
  MALE: '1',
  FEMALE: '2',
} as const

export const TouristGenderLabel = {
  [TouristGenderEnum.UNKNOWN]: '未知',
  [TouristGenderEnum.MALE]: '男',
  [TouristGenderEnum.FEMALE]: '女',
} as const

/** 是否全盲：0否 1是 */
export const BlindStatusEnum = {
  NO: '0',
  YES: '1',
} as const
export type BlindStatus = (typeof BlindStatusEnum)[keyof typeof BlindStatusEnum]

export const BlindStatusLabel = {
  [BlindStatusEnum.NO]: '否',
  [BlindStatusEnum.YES]: '是',
} as const

/** 亲子游属性：0否 1是 */
export const FamilyFriendlyEnum = {
  NO: '0',
  YES: '1',
} as const
export type FamilyFriendly = (typeof FamilyFriendlyEnum)[keyof typeof FamilyFriendlyEnum]

export const FamilyFriendlyLabel = {
  [FamilyFriendlyEnum.NO]: '否',
  [FamilyFriendlyEnum.YES]: '是',
} as const

/** 休闲指数：0轻松 1休闲 2中强度 3高强度 4暴虐强度 */
export const LeisureRatingEnum = {
  EASY: '0',
  RELAXED: '1',
  MODERATE: '2',
  INTENSE: '3',
  EXTREME: '4',
} as const
export type LeisureRating = (typeof LeisureRatingEnum)[keyof typeof LeisureRatingEnum]

export const LeisureRatingLabel = {
  [LeisureRatingEnum.EASY]: '轻松',
  [LeisureRatingEnum.RELAXED]: '休闲',
  [LeisureRatingEnum.MODERATE]: '中强度',
  [LeisureRatingEnum.INTENSE]: '高强度',
  [LeisureRatingEnum.EXTREME]: '暴虐强度',
} as const

/** 经典指数：1-10星 */
export const ClassicRatingOptions = Array.from({ length: 10 }, (_, i) => ({
  label: `${i + 1}星`,
  value: String(i + 1),
}))

/** 推荐指数：0-10 — 餐饮 */
export const DiningRecommendRatingOptions = Array.from({ length: 11 }, (_, i) => ({
  label: `${i}分`,
  value: i,
}))

/** 推荐指数：0-5 — 跟拍 */
export const PhotographyRecommendRatingOptions = Array.from({ length: 6 }, (_, i) => ({
  label: `${i}分`,
  value: i,
}))

/** 特色星级：1-5星 — 菜品 */
export const SpecialStarOptions = Array.from({ length: 5 }, (_, i) => ({
  label: `${i + 1}星`,
  value: i + 1,
}))

/** 黑暗程度：special_dark=特黑, light_dark=浅黑, normal=正常 */
export const DarkLevelEnum = {
  SPECIAL_DARK: 'special_dark',
  LIGHT_DARK: 'light_dark',
  NORMAL: 'normal',
} as const
export type DarkLevel = (typeof DarkLevelEnum)[keyof typeof DarkLevelEnum]

export const DarkLevelLabel = {
  [DarkLevelEnum.SPECIAL_DARK]: '特黑',
  [DarkLevelEnum.LIGHT_DARK]: '浅黑',
  [DarkLevelEnum.NORMAL]: '正常',
} as const

/** 室内/室外 */
export const IndoorOutdoorEnum = {
  INDOOR: '室内',
  OUTDOOR: '室外',
} as const
export type IndoorOutdoor = (typeof IndoorOutdoorEnum)[keyof typeof IndoorOutdoorEnum]

export const IndoorOutdoorLabel = {
  [IndoorOutdoorEnum.INDOOR]: '室内',
  [IndoorOutdoorEnum.OUTDOOR]: '室外',
} as const

/** 不宜出行因素：0高温 1暴雨 2冰冻 3心脏病 4高血压 5恐高 */
export const BadFactorsEnum = {
  HIGH_TEMP: '0',
  HEAVY_RAIN: '1',
  FREEZING: '2',
  HEART_DISEASE: '3',
  HIGH_BP: '4',
  ACROPHOBIA: '5',
} as const
export type BadFactors = (typeof BadFactorsEnum)[keyof typeof BadFactorsEnum]

export const BadFactorsLabel = {
  [BadFactorsEnum.HIGH_TEMP]: '高温',
  [BadFactorsEnum.HEAVY_RAIN]: '暴雨',
  [BadFactorsEnum.FREEZING]: '冰冻',
  [BadFactorsEnum.HEART_DISEASE]: '心脏病',
  [BadFactorsEnum.HIGH_BP]: '高血压',
  [BadFactorsEnum.ACROPHOBIA]: '恐高',
} as const

/** 住宿类型：0酒店 1民宿 */
export const AccommodationTypeEnum = {
  HOTEL: '0',
  HOMESTAY: '1',
} as const
export type AccommodationType = (typeof AccommodationTypeEnum)[keyof typeof AccommodationTypeEnum]

export const AccommodationTypeLabel = {
  [AccommodationTypeEnum.HOTEL]: '酒店',
  [AccommodationTypeEnum.HOMESTAY]: '民宿',
} as const

/** 含早餐：0否 1是 */
export const BreakfastIncludedLabel = {
  '0': '不含',
  '1': '含',
} as const

/** 宠物友好：0否 1是 */
export const PetFriendlyLabel = {
  '0': '不可',
  '1': '可',
} as const

/** 时令菜：0否 1是 */
export const SeasonalLabel = {
  '0': '否',
  '1': '是',
} as const

/** 提前预约(菜品)：0否 1是 */
export const ReservationLabel = {
  '0': '否',
  '1': '是',
} as const

/** 餐饮性质：0早餐 1正餐 2宵夜 3其他 */
export const DiningNatureEnum = {
  BREAKFAST: '0',
  MAIN_MEAL: '1',
  LATE_NIGHT: '2',
  OTHER: '3',
} as const
export type DiningNature = (typeof DiningNatureEnum)[keyof typeof DiningNatureEnum]

export const DiningNatureLabel = {
  [DiningNatureEnum.BREAKFAST]: '早餐',
  [DiningNatureEnum.MAIN_MEAL]: '正餐',
  [DiningNatureEnum.LATE_NIGHT]: '宵夜',
  [DiningNatureEnum.OTHER]: '其他',
} as const

/** 停车位：0否 1是 */
export const ParkingAvailableLabel = {
  '0': '否',
  '1': '是',
} as const

/** 行程状态：0草稿 1已确认 2已完成 3已取消 */
export const ItineraryStatusEnum = {
  DRAFT: '0',
  CONFIRMED: '1',
  COMPLETED: '2',
  CANCELLED: '3',
} as const
export type ItineraryStatus = (typeof ItineraryStatusEnum)[keyof typeof ItineraryStatusEnum]

export const ItineraryStatusLabel = {
  [ItineraryStatusEnum.DRAFT]: '草稿',
  [ItineraryStatusEnum.CONFIRMED]: '已确认',
  [ItineraryStatusEnum.COMPLETED]: '已完成',
  [ItineraryStatusEnum.CANCELLED]: '已取消',
} as const

/** 创建方式：1复制 2确认生成 3一键生成 */
export const CreateFromEnum = {
  COPY: '1',
  CONFIRM_GENERATE: '2',
  ONE_CLICK: '3',
} as const

export const CreateFromLabel = {
  [CreateFromEnum.COPY]: '复制',
  [CreateFromEnum.CONFIRM_GENERATE]: '确认生成',
  [CreateFromEnum.ONE_CLICK]: '一键生成',
} as const

/** 体力等级：0有点弱 1一般般 2精力充沛 3运动员级 */
export const StaminaEnum = {
  WEAK: '0',
  NORMAL: '1',
  STRONG: '2',
  ATHLETE: '3',
} as const
export type Stamina = (typeof StaminaEnum)[keyof typeof StaminaEnum]

export const StaminaLabel = {
  [StaminaEnum.WEAK]: '有点弱',
  [StaminaEnum.NORMAL]: '一般般',
  [StaminaEnum.STRONG]: '精力充沛',
  [StaminaEnum.ATHLETE]: '运动员级',
} as const

/** 区域级别：0全国 1省 2市 3区县 */
export const RegionLevelEnum = {
  NATIONAL: '0',
  PROVINCE: '1',
  CITY: '2',
  DISTRICT: '3',
} as const

export const RegionLevelLabel = {
  [RegionLevelEnum.NATIONAL]: '全国',
  [RegionLevelEnum.PROVINCE]: '省',
  [RegionLevelEnum.CITY]: '市',
  [RegionLevelEnum.DISTRICT]: '区县',
} as const

/** 附件业务类型 */
export const BizTypeEnum = {
  ATTRACTION: 'attraction',
  CHECKIN: 'checkin',
  ACCOMMODATION: 'accommodation',
  DINING: 'dining',
  CAR: 'car',
  PHOTOGRAPHY: 'photography',
  DISH: 'dish',
  TEMPLATE: 'template',
} as const

/** 附件文件类型 */
export const ResourceTypeEnum = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
} as const

/** 附件用途 */
export const ResourcePurposeEnum = {
  COVER: 'cover',
  BANNER: 'banner',
  DETAIL: 'detail',
  GUIDE: 'guide',
  MANUAL: 'manual',
  MENU: 'menu',
  OTHER: 'other',
} as const

/** ProTable 状态 valueEnum (启用/禁用带状态徽章) */
export const SwitchDesc = {
  true: { text: '启用', status: 'Success' },
  false: { text: '禁用', status: 'Error' },
} as const

export const SwitchOptions = [
  { label: '启用', value: true },
  { label: '禁用', value: false },
] as const

/** Helper: convert enum value to label */
export function enumToLabel<T extends string>(labelMap: Record<T, string>, value: T | string | undefined | null): string {
  if (value == null) return '--'
  return labelMap[value as T] ?? '--'
}