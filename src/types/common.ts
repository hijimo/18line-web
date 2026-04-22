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