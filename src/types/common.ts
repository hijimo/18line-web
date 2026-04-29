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
export type AttachmentPurpose = 'cover' | 'banner' | 'detail' | 'guide' | 'manual' | 'menu' | 'other';

/** 附件对象 */
export interface Attachment {
  /** 用途：cover-封面, banner-横幅, detail-详情, guide-导览, manual-手册, menu-菜单, other-其他 */
  purpose: AttachmentPurpose;
  /** 文件名 */
  name: string;
  /** 排序 */
  sort: number;
  /** 文件 URL */
  url: string;
}

/** 将 attachments JSON 字符串反序列化为数组 */
export const parseAttachments = (attachments: string | undefined | null): Attachment[] => {
  if (!attachments) return [];
  try {
    const parsed = JSON.parse(attachments);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Attachment =>
        typeof item === 'object' && item !== null && typeof item.url === 'string',
    );
  } catch {
    return [];
  }
};

/** 将 attachments 数组序列化为 JSON 字符串 */
export const stringifyAttachments = (attachments: Attachment[]): string => {
  return JSON.stringify(attachments);
};
