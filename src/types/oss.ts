/** OSS 签名凭证数据 */
export interface OssSignData {
  /** OSS 上传地址 */
  host: string;
  /** 上传策略（Base64 编码） */
  policy: string;
  /** 签名 */
  signature: string;
  /** AccessKey ID */
  accessKeyId: string;
  /** 签名过期时间（ISO 8601） */
  expiration: string;
  /** 上传目录前缀 */
  uploadDir: string;
  /** CDN 域名 */
  cdnDomain: string;
}
