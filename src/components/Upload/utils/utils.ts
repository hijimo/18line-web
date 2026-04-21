import type { File } from '@/types';
import { FileUploadStateEnums, orginFileSymbol } from '@/types/file';
import _get from 'lodash-es/get';
import _isObject from 'lodash-es/isObject';
import { getFileMIME } from './file';

export const getMaxSize = (file: File, maxSize: any | number) =>
  _isObject(maxSize) ? _get(maxSize, file.type) : maxSize;

export const checkIsSizeOut = (file: File, maxSize: number) => {
  const max = getMaxSize(file, maxSize);
  return +file.size / 1024 > max;
};

export const inAccpetList = (type: string, accpet: string) => {
  if (!accpet || !type) return true;

  const accpetList = accpet
    .split(',')
    .filter((it) => it === type || getFileMIME(it).includes(type));
  return accpetList && accpetList.length > 0;
};

export const genUid = () =>
  `uc-upload-${new Date().valueOf()}-${Math.floor(Math.random() * 10000)}`;
export const formatFileList = (tempfiles: FileList): File[] => {
  const ary: File[] = [];
  for (let i = 0; i < tempfiles.length; i += 1) {
    const file = tempfiles.item(i) as globalThis.File;
    const uid = genUid();
    ary.push({
      // 这个展开是无效的，因为File对象无法被展开
      ...file,
      tmpUrl: '',
      url: '',
      uid,
      status: FileUploadStateEnums.Initial,
      progress: 0,
      error: undefined,
      [orginFileSymbol]: file,
    });
  }
  return ary;
};

export const diff = (filest1?: File[], filest2?: File[]): boolean => {
  if (Array.isArray(filest1) !== Array.isArray(filest2)) {
    return true;
  }
  if (filest1?.length !== filest2?.length) {
    return true;
  }
  let t = false;
  if (filest1 !== undefined && filest2 !== undefined) {
    filest1?.forEach((it, index) => {
      t = it.uid !== (filest2[index] as File).uid;
    });
  }
  return t;
};
