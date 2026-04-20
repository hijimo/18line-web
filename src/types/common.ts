export interface ResponseData<T = any> {
  code: number;
  message: string;
  result: {
    data: T;
  };
  sessionId: string;
}
export interface ResponseData2<T = any> {
  code: number;
  message: string;
  result: T;
  sessionId: string;
}

export interface ResponseData3<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface ResponsePaginationData<T = any> extends ResponseData<T> {
  data: {
    data: T;
    pageNo: number;
    pageSize: number;
    totalCount: number;
    totalPage: number;
  };
  sessionId: string;
}

export interface PaginationParams {
  pageNo: number;
  pageSize: number;
}
