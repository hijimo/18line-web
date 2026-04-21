// 使用于阿里云oss直传的自定义 ckEditor UploadAdapter
// 同时兼容antd 的customRequest

// import { message } from 'antd';
import { get as getCommonApi } from '@/services/api/通用/通用';
import dayjs from 'dayjs';
import { genUniqueFileName } from './file';
import { getUploadSign, setUploadSign } from './ls';

const commonApi = getCommonApi();

const getOssSign = async () => {
  return commonApi.uploadFile();
};

const genKey = (dir: string, filename: string) => {
  return `${dir}/${dayjs(new Date()).format('YYYYMM')}/${genUniqueFileName(filename)}`;
};
const genFileUrl = (host: string, key: string) => {
  return `${host}/${key}`;
};
const defaultHeaders = (filename: string) => ({
  'Cache-Control': 'max-age=31536000',
  'Content-Disposition': `filename="${filename}"`,
});

const assignHeaders = (xhr: XMLHttpRequestExtend, headers: any, file: File) => {
  const { name: filename } = file;
  const headerOptions = { ...headers, ...defaultHeaders(filename) };
  Object.keys(headerOptions).forEach((header: string) => {
    xhr.setRequestHeader(header, encodeURIComponent(headerOptions[header]));
  });
};

export interface XMLHttpRequestExtend extends XMLHttpRequest {
  fileUrl?: string;
}
class Uploader {
  opts: any = null;

  sign: any = null;

  xhr: XMLHttpRequestExtend | null = null;

  constructor(opts: any) {
    this.opts = opts;
  }

  async getUploadSignInfo() {
    const { onError } = this.opts;

    const sign = this.sign || getUploadSign();
    // 以秒为单位
    if (sign) {
      const t = Math.floor(new Date().valueOf() / 1000) + 30 * 60;
      if (new Date(sign.expire).valueOf() / 1000 >= t) {
        return sign;
      }
    }

    try {
      const { code, result } = await getOssSign();
      const success = code === 0;

      if (success) {
        const { data } = result;
        data.creator = Math.floor(new Date().valueOf() / 1000);
        setUploadSign(data);
        return data;
      }
    } catch (error) {
      // 如果获取证书失败，直接返回文件上传失败
      onError?.((error as Error).message || '');
    }

    return null;
  }

  async upload(file: globalThis.File) {
    this.sign = await this.getUploadSignInfo();
    const f = file || this.opts.file;
    if (this.sign) {
      this.initRequest(f);
      this.initListeners();
      this.sendRequest(f);
    } else {
      // message.error('file upload fail');
    }
  }

  initRequest(file: globalThis.File) {
    this.xhr = new XMLHttpRequest();
    const { xhr } = this;
    const { host } = this.sign;
    const { headers, withCredentials = false } = this.opts;
    xhr.open('POST', host, true);
    xhr.responseType = 'json';
    xhr.withCredentials = withCredentials;
    assignHeaders(xhr, headers, file);
  }

  initListeners() {
    const { opts, xhr } = this;
    const { onError, onProgress, onSuccess } = opts;

    if (xhr !== null) {
      xhr.addEventListener('error', (e) => {
        if (onError) {
          onError(e);
        }
      });
      xhr.addEventListener('abort', (e) => {
        if (onError) {
          onError(e);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status !== 200 && onError) {
          onError(xhr || '');
        }

        if (xhr.status === 200 && onSuccess) {
          onSuccess(xhr);
        }
      });
    }

    if (xhr?.upload) {
      xhr.upload.addEventListener('progress', ({ loaded, total }) => {
        if (onProgress) {
          onProgress(parseFloat(((loaded / total) * 100).toFixed(2)));
        }
      });
    }
  }

  sendRequest(file: globalThis.File) {
    const { name = 'file', data } = this.opts;
    const fd = new FormData();

    const { OSSAccessKeyId, dir, policy, signature, host } = this.sign;
    const key = genKey(dir, file.name);
    const oss = {
      OSSAccessKeyId,
      success_action_status: '200',
      policy,
      signature,
      key,
    };

    const otherData = { ...(data || {}), ...oss };

    Object.keys(otherData).forEach((objectKey) => {
      fd.append(objectKey, otherData[objectKey]);
    });

    fd.append(name, file);
    if (this.xhr) {
      this.xhr.fileUrl = genFileUrl(host, key);
      this.xhr.send(fd);
    }
  }

  abort() {
    if (this.xhr) {
      this.xhr.abort();
    }
  }
}

export default Uploader;
