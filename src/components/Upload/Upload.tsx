import type { File } from '@/types';
import { FileUploadStateEnums, orginFileSymbol } from '@/types/file';
import { CloseCircleOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { getFileIcon, isImage, isVideo } from './utils/file';
import type { XMLHttpRequestExtend } from './utils/Uploader';
import Uploader from './utils/Uploader';

import styles from './Upload.less';

export interface UploadProps {
  className?: string;
  style?: React.CSSProperties;
  // 服务器接收file的字段名
  name?: string;
  // 额外的post data数参
  data?: any;
  // 上传中
  onProgress?: (progress: number, file: File) => void;
  // 当某个文件上传出错
  onError?: (file: File, msg?: string) => void;
  // 当某个文件上传完成
  onSuccess?: (res: XMLHttpRequestExtend, fileUrl: string, file: File) => void;
  onRemove?: (e: React.MouseEvent<HTMLSpanElement, MouseEvent>, file: File) => void;
}
interface UploadPropsExt extends UploadProps {
  file: File;
}

const getThumUrl = (file: File) => {
  const { name, url } = file;
  let thumbUrl = '';

  const filename = name || url;
  if (isImage(filename)) {
    if (file.tmpUrl) {
      thumbUrl = file.tmpUrl;
    } else {
      thumbUrl = `${url}?x-oss-process=image/resize,m_mfit,h_100`;
    }
  } else if (isVideo(filename)) {
    thumbUrl = `${url}?x-oss-process=video/snapshot,t_0,f_jpg,w_100,h_100,m_fast`;
  } else {
    thumbUrl = getFileIcon(name);
  }

  return thumbUrl;
};

const Upload: React.FC<UploadPropsExt> = ({
  className,
  name = 'file',
  data,
  style,
  file,
  onProgress,
  onRemove,
  onSuccess,
  onError,
}) => {
  const [error, handleError] = useState<boolean>(false);
  const [progress, handleProgress] = useState<number>(0);
  const uploaderRef = useRef<any>(null);
  // 文件上传
  const upload = () => {
    if (!uploaderRef.current) {
      const uploader = new Uploader({
        formData: data,
        name,
        file: file[orginFileSymbol],
        onError(msg?: string) {
          handleError(true);
          if (onError) {
            onError(file, msg);
          }
        },
        onProgress(p: number) {
          handleProgress(p);
          if (onProgress) {
            onProgress(p, file);
          }
        },
        onSuccess(res: XMLHttpRequestExtend) {
          if (onSuccess) {
            onSuccess(res, res.fileUrl as string, file);
          }
        },
      });
      uploaderRef.current = uploader;
    }

    uploaderRef.current.upload(file[orginFileSymbol]);
  };

  useEffect(() => {
    return () => {
      if (uploaderRef.current) {
        uploaderRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (file && file.status === FileUploadStateEnums.Initial) {
      upload();
    }
  }, [file, upload]);

  return (
    <div
      className={classNames(
        styles.uploadItem,
        className,
        'uc-uploadlist-item',
        error ? styles.error : '',
      )}
      style={style}
    >
      <img
        key={getThumUrl(file) || file.url}
        src={getThumUrl(file) || file.url}
        className={classNames(styles.uploadItemIcon, 'uc-uploadlist-item-icon')}
      />
      {/* 进度条 */}
      {progress && progress < 100 && (
        <div
          style={{ width: `${progress}%` }}
          className={classNames(styles.uploadItemProgress, 'uc-uploadlist-item-progress')}
        />
      )}
      <CloseCircleOutlined
        onClick={(e) => {
          if (onRemove) {
            onRemove(e, file);
          }
        }}
        className={classNames(styles.uploadItemClose, 'uc-uploadlist-item-close')}
      />
      <div className={classNames(styles.uploadItemButtons, 'uc-uploadlist-item-buttons')}>
        {/* 重新上传 */}
        {/* 预览 */}
      </div>
    </div>
  );
};

export default Upload;
