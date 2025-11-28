/**
 * 上传策略数据类型
 */
export interface UploadPolicyData {
  upload_dir: string;
  upload_host: string;
  oss_access_key_id: string;
  signature: string;
  policy: string;
  x_oss_object_acl: string;
  x_oss_forbid_overwrite: string;
}

/**
 * 上传结果
 */
export interface UploadResult {
  ossUrl: string;
  expireTime: Date;
}

/**
 * Cloudflare Workers环境变量类型
 */
export interface Env {
  // DashScope API Key (应该作为Secret设置)
  DASHSCOPE_API_KEY: string;
  // 默认模型名称
  DEFAULT_MODEL_NAME?: string;
  // API区域: "China" 或 "International"
  API_REGION?: string;
}