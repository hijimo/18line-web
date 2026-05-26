export const orginFileSymbol = Symbol('orginFile');

export type File = {
  uid: string;
  name: string;
  url?: string;
  tmpUrl?: string;
  type?: string;
  status?: FileUploadStateEnums;
  size?: number;
  [orginFileSymbol]?: globalThis.File;
  [key: string]: unknown;
};

export enum FileUploadStateEnums {
  Initial = 'initial',
  Uploading = 'uploading',
  Done = 'done',
  Fail = 'fail',
}
