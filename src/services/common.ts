import type { ResponseData } from '@/types/common';
import type { OssSignData } from '@/types/oss';
import request from '@/utils/request';

export async function getOssSign() {
  return request<ResponseData<OssSignData>>('/travel18/oss/credential', {
    params: {
      bizType: 'attraction',
    },
  });
}
