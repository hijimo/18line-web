import _isObject from 'lodash/isObject';

export function get(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) as any);
  } catch (ex) {
    return localStorage.getItem(key);
  }
}

export function set(key: string, value: any) {
  const v = _isObject(value) ? JSON.stringify(value) : value;

  return localStorage.setItem(key, v);
}

// 文件上传凭证

const KEY_UPLOAD_SIGN = '__upload_sign_object';
export function getUploadSign() {
  return get(KEY_UPLOAD_SIGN);
}
export function setUploadSign(signObject: any) {
  return set(KEY_UPLOAD_SIGN, signObject);
}
