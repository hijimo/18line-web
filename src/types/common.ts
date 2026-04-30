/** RuoYi AjaxResult: {code, msg, data?} */
export interface ResponseData<T = any> {
  code: number;
  msg: string;
  data?: T;
}

/** RuoYi TableDataInfo: {code, msg, total, rows} */
export interface ResponsePaginationData<T = any> {
  code: number;
  msg: string;
  total: number;
  rows: T[];
}

export interface PaginationParams {
  pageNo: number;
  pageSize: number;
}

/** 附件用途枚举 */
export type AttachmentPurpose =
  | 'cover' | 'banner' | 'detail' | 'guide' | 'manual' | 'menu' | 'other'
  // 包车服务
  | 'car_exterior' | 'car_interior' | 'driving_license' | 'vehicle_license'
  // 跟拍服务
  | 'portfolio' | 'photographer_photo'
  // 住宿管理
  | 'room' | 'lobby' | 'bathroom' | 'public_area';

/** 附件对象 */
export interface Attachment {
  /** 用途 */
  purpose: AttachmentPurpose;
  /** 文件名 */
  name: string;
  /** 排序 */
  sort: number;
  /** 文件 URL */
  url: string;
}

/** 将上传组件的文件列表转为 Attachment 数组 */
export const toAttachments = (
  files: { url: string; name?: string }[] | undefined,
  purpose: AttachmentPurpose = 'other',
): Attachment[] =>
  (files || []).map((f, i) => ({ purpose, name: f.name || '', sort: i + 1, url: f.url }));
