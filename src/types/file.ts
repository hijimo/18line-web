export const orginFileSymbol: unique symbol = Symbol('orginFile');

export type File = {
  uid: string;
  name: string;
  url?: string;
  tmpUrl?: string;
  type?: string;
  status?: FileUploadStateEnums;
  size?: number;
  [orginFileSymbol]?: globalThis.File;
  [key: string]: TODO;
};

export enum FileUploadStateEnums {
  Initial = 'initial',
  Uploading = 'uploading',
  Done = 'done',
  Fail = 'fail',
}
