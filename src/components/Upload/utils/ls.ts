import _isObject from 'lodash-es/isObject';

export function get(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) as TODO);
  } catch {
    return localStorage.getItem(key);
  }
}

export function set(key: string, value: TODO) {
  const v = _isObject(value) ? JSON.stringify(value) : value;

  return localStorage.setItem(key, v);
}

// 文件上传凭证

const KEY_UPLOAD_SIGN = '__upload_sign_object';
export function getUploadSign() {
  return get(KEY_UPLOAD_SIGN);
}
export function setUploadSign(signObject: TODO) {
  return set(KEY_UPLOAD_SIGN, signObject);
}
