import { v1 as uuidv1 } from 'uuid';
import docPngUrl from '@/components/Upload/assets/doc.png';
import pdfPngUrl from '@/components/Upload/assets/pdf.png';
import txtPngUrl from '@/components/Upload/assets/txt.png';
import xlsPngUrl from '@/components/Upload/assets/xls.png';
import otherPngUrl from '@/components/Upload/assets/other.png';

type FileIconMap = Record<string, string>;

type FileMIMEMap = Record<string, string>;

export const docIcon = docPngUrl;
export const pdfIcon = pdfPngUrl;
export const txtIcon = txtPngUrl;
export const xlsIcon = xlsPngUrl;
export const otherIcon = otherPngUrl;

export const ImageExtList = ['.jpeg', '.jpg', '.png', '.gif', '.webp'];
export const VideoExtList = ['.mp4'];
export const DocExtList = ['.doc', '.docx'];
export const XlsExtList = ['.xls', '.xlsx'];
export const PdfExtList = ['.pdf'];

const fileMIMEMap: FileMIMEMap = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp4': 'video/mp4',
};
const fileIconMap: FileIconMap = {
  '.doc': docIcon,
  '.docx': docIcon,
  '.pdf': pdfIcon,
  '.txt': txtIcon,
  '.xls': xlsIcon,
  '.xlsx': xlsIcon,
};

export function includes(ext = '', extList: string[] = []) {
  return extList.includes(ext);
}
export function genUniqueFileName(filename = '') {
  return `${uuidv1()}${getExtname(filename)}`;
}
export function getExtname(filename = '') {
  if (!filename) return '';

  const names = filename.split('.');

  return `.${names[names.length - 1].toLowerCase()}`;
}
export function getFileIcon(filename = ''): any {
  return fileIconMap[getExtname(filename)] || otherIcon;
}
export function getFileMIME(filename = '') {
  return fileMIMEMap[getExtname(filename)] || '';
}

export function isImage(filename = '') {
  const isImageFile = includes(getExtname(filename), ImageExtList);
  const isImageBase64 = filename.includes('data:image');
  return isImageFile || isImageBase64;
}
export function isVideo(filename = '') {
  return includes(getExtname(filename), VideoExtList);
}
export function isPdf(filename = '') {
  return includes(getExtname(filename), PdfExtList);
}
export function isDoc(filename = '') {
  return includes(getExtname(filename), DocExtList);
}
export function isXls(filename = '') {
  return includes(getExtname(filename), XlsExtList);
}
