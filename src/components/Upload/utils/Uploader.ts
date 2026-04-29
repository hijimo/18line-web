// 使用于阿里云oss直传的自定义 ckEditor UploadAdapter
// 同时兼容antd 的customRequest

import { getOssSign } from '@/services/common';
import type { OssSignData } from '@/types/oss';
import { genUniqueFileName } from './file';
import { getUploadSign, setUploadSign } from './ls';

/** 生成 OSS 对象 key */
const genKey = (uploadDir: string, filename: string) => {
  return `${uploadDir}${genUniqueFileName(filename)}`;
};

/** 生成文件访问 URL（使用 host 域名） */
const genFileUrl = (host: string, key: string) => {
  return `${host}/${key}`;
};

const defaultHeaders = (filename: string) => ({
  'Cache-Control': 'max-age=31536000',
  'Content-Disposition': `filename="${filename}"`,
});

const assignHeaders = (xhr: XMLHttpRequestExtend, headers: Record<string, string> | undefined, file: File) => {
  const { name: filename } = file;
  const headerOptions = { ...headers, ...defaultHeaders(filename) };
  Object.keys(headerOptions).forEach((header: string) => {
    xhr.setRequestHeader(header, encodeURIComponent(headerOptions[header]));
  });
};

export interface XMLHttpRequestExtend extends XMLHttpRequest {
  fileUrl?: string;
}

interface UploaderOpts {
  file?: globalThis.File;
  name?: string;
  data?: Record<string, string>;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  onError?: (error: unknown) => void;
  onProgress?: (percent: number) => void;
  onSuccess?: (xhr: XMLHttpRequestExtend) => void;
}

class Uploader {
  opts: UploaderOpts;

  sign: (OssSignData & { creator?: number }) | null = null;

  xhr: XMLHttpRequestExtend | null = null;

  constructor(opts: UploaderOpts) {
    this.opts = opts;
  }

  async getUploadSignInfo(): Promise<(OssSignData & { creator?: number }) | null> {
    const { onError } = this.opts;

    const sign = this.sign || getUploadSign();
    // 以秒为单位，检查签名是否仍有效（提前 30 分钟过期）
    if (sign) {
      const t = Math.floor(Date.now() / 1000) + 30 * 60;
      if (new Date(sign.expiration).valueOf() / 1000 >= t) {
        return sign;
      }
    }

    try {
      const { code, data } = await getOssSign();
      if (code === 200 && data) {
        const signData = { ...data, creator: Math.floor(Date.now() / 1000) };
        setUploadSign(signData);
        return signData;
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
    }
  }

  initRequest(file: globalThis.File) {
    this.xhr = new XMLHttpRequest();
    const { xhr } = this;
    const { host } = this.sign!;
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
        onError?.(e);
      });
      xhr.addEventListener('abort', (e) => {
        onError?.(e);
      });
      xhr.addEventListener('load', () => {
        if (xhr.status !== 200) {
          onError?.(xhr);
        } else {
          onSuccess?.(xhr);
        }
      });
    }

    if (xhr?.upload) {
      xhr.upload.addEventListener('progress', ({ loaded, total }) => {
        onProgress?.(parseFloat(((loaded / total) * 100).toFixed(2)));
      });
    }
  }

  sendRequest(file: globalThis.File) {
    const { name = 'file', data } = this.opts;
    const fd = new FormData();

    const { accessKeyId, uploadDir, policy, signature, host } = this.sign!;
    const key = genKey(uploadDir, file.name);
    const oss: Record<string, string> = {
      OSSAccessKeyId: accessKeyId,
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
