export type File = {
  uid: string;
  name: string;
  url?: string;
  tmpUrl?: string;
  type?: string;
  status?: FileUploadStateEnums;
  size?: number;
  [key: string]: TODO;
};

export enum FileUploadStateEnums {
  Initial = 'initial',
  Uploading = 'uploading',
  Done = 'done',
  Fail = 'fail',
}

export const orginFileSymbol = Symbol('orginFile');
