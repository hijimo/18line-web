export interface File {
  uid: string;
  name: string;
  url?: string;
  tmpUrl?: string;
  type?: string;
  status?: FileUploadStateEnums;
  size?: number;
  [key: string]: any;
}

export enum FileUploadStateEnums {
  Initial = 'initial',
  Uploading = 'uploading',
  Done = 'done',
  Fail = 'fail',
}

export const orginFileSymbol = Symbol('orginFile');