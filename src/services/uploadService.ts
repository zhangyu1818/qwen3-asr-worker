import type { UploadPolicyData, UploadResult } from '../types';

const BASE_URL = 'https://dashscope.aliyuncs.com';
const DEFAULT_EXPIRY_HOURS = 48;

/**
 * 获取文件上传凭证
 * @param apiKey API密钥
 * @param modelName 模型名称
 * @returns 上传策略数据
 */
export const getUploadPolicy = async (apiKey: string, modelName: string): Promise<UploadPolicyData> => {
  const url = `${BASE_URL}/api/v1/uploads`;
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const params = new URLSearchParams({
    action: 'getPolicy',
    model: modelName
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get upload policy: ${response.status} ${errorText}`);
    }

    const result = await response.json() as { data: UploadPolicyData };
    return result.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`获取上传策略失败: ${error.message}`);
    }
    throw new Error('获取上传策略时发生未知错误');
  }
};

/**
 * 将文件上传到OSS
 * @param policyData 上传策略数据
 * @param file 要上传的文件
 * @returns OSS URL
 */
export const uploadFileToOSS = async (policyData: UploadPolicyData, file: File): Promise<string> => {
  const fileName = file.name || `upload_${Date.now()}`;
  const key = `${policyData.upload_dir}/${fileName}`;

  try {
    const formData = new FormData();

    // 添加OSS上传所需字段
    formData.append('OSSAccessKeyId', policyData.oss_access_key_id);
    formData.append('Signature', policyData.signature);
    formData.append('policy', policyData.policy);
    formData.append('x-oss-object-acl', policyData.x_oss_object_acl);
    formData.append('x-oss-forbid-overwrite', policyData.x_oss_forbid_overwrite);
    formData.append('key', key);
    formData.append('success_action_status', '200');
    formData.append('file', file);

    const response = await fetch(policyData.upload_host, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
    }

    return `oss://${key}`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`文件上传失败: ${error.message}`);
    }
    throw new Error('文件上传时发生未知错误');
  }
};

/**
 * 上传文件并获取URL
 * @param apiKey API密钥
 * @param modelName 模型名称
 * @param file 要上传的文件
 * @param validityHours 文件有效期（小时，默认48小时）
 * @returns 上传结果
 */
export const uploadFileAndGetUrl = async (
  apiKey: string,
  modelName: string,
  file: File,
  validityHours: number = DEFAULT_EXPIRY_HOURS
): Promise<UploadResult> => {
  // 1. 获取上传凭证（上传凭证接口有限流，超出限流将导致请求失败）
  const policyData = await getUploadPolicy(apiKey, modelName);

  // 2. 上传文件到OSS
  const ossUrl = await uploadFileToOSS(policyData, file);

  // 3. 计算过期时间
  const expireTime = new Date();
  expireTime.setHours(expireTime.getHours() + validityHours);

  return { ossUrl, expireTime };
};