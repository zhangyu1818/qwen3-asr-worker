import type { Env } from '../types';

// ASR服务API端点配置
const ASR_ENDPOINTS = {
  China: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  International: 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
};

/**
 * 根据区域获取ASR服务端点
 */
function getASREndpoint(region?: string): string {
  const normalizedRegion = region === 'International' ? 'International' : 'China';
  return ASR_ENDPOINTS[normalizedRegion];
}

// 支持的语言列表
const SUPPORTED_LANGUAGES = [
  'zh', 'yue', 'en', 'ja', 'de', 'ko', 'ru', 'fr', 'pt', 'ar',
  'it', 'es', 'hi', 'id', 'th', 'tr', 'uk', 'vi'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 支持的情感类型
type EmotionType = 'surprised' | 'neutral' | 'happy' | 'sad' | 'disgusted' | 'angry' | 'fearful';

/**
 * ASR请求参数
 */
interface ASRRequestParams {
  audioUrl: string;
  model: string;
  language?: SupportedLanguage;
  enableITN?: boolean;
  context?: string;
}

/**
 * ASR响应数据结构
 */
interface ASRResponse {
  output: {
    choices: Array<{
      finish_reason: 'stop' | 'length' | null;
      message: {
        role: 'assistant';
        content: Array<{
          text: string;
        }>;
        annotations: Array<{
          language: SupportedLanguage;
          type: 'audio_info';
          emotion: EmotionType;
        }>;
      };
    }>;
  };
  usage: {
    input_tokens_details?: {
      text_tokens: number;
    };
    output_tokens_details: {
      text_tokens: number;
    };
    seconds?: number;
  };
  request_id: string;
}

/**
 * OpenAI兼容的转录响应
 */
interface OpenAITranscriptionResponse {
  text: string;
  task: 'transcribe';
  language: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

/**
 * OpenAI兼容的详细响应
 */
interface OpenAIVerboseResponse extends OpenAITranscriptionResponse {
  request_id: string;
  timestamp: string;
  upload_info?: {
    oss_url: string;
    expire_time: string;
    model_used: string;
  };
  processing_time_ms: number;
  asr_metadata?: {
    detected_language: string;
    emotion: string;
    finish_reason: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
      audio_seconds: number;
    };
  };
}

/**
 * 调用通义千问ASR服务
 */
export async function callASRService(
  env: Env,
  params: ASRRequestParams
): Promise<ASRResponse> {
  const {
    audioUrl,
    model,
    language,
    enableITN = false,
    context = ''
  } = params;
  const apiKey = env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY not configured');
  }

  // 构建请求体
  const requestBody = {
    model,
    input: {
      messages: [
        {
          content: [
            {
              text: context
            }
          ],
          role: 'system'
        },
        {
          content: [
            {
              audio: audioUrl
            }
          ],
          role: 'user'
        }
      ]
    },
    parameters: {
      asr_options: {
        enable_itn: enableITN,
        ...(language && { language })
      }
    }
  };

  const asrEndpoint = getASREndpoint(env.API_REGION);

  console.log('ASR request:', {
    endpoint: asrEndpoint,
    region: env.API_REGION || 'China (default)',
    audioUrl,
    language,
    enableITN,
    contextLength: context.length
  });

  try {
    const response = await fetch(asrEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-OssResourceResolve': 'enable' // 必需：支持临时oss://URL解析
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ASR service error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as ASRResponse;

    console.log('ASR response:', {
      requestId: result.request_id,
      finishReason: result.output.choices[0]?.finish_reason,
      textLength: result.output.choices[0]?.message.content[0]?.text?.length,
      detectedLanguage: result.output.choices[0]?.message.annotations[0]?.language
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ASR service call failed: ${error.message}`);
    }
    throw new Error('ASR service call failed with unknown error');
  }
}

/**
 * 将ASR响应转换为OpenAI兼容格式
 */
export function convertToOpenAIFormat(
  asrResponse: ASRResponse,
  processingTimeMs: number,
  uploadInfo?: {
    ossUrl: string;
    expireTime: Date;
    modelUsed: string;
  }
): OpenAITranscriptionResponse {
  const choice = asrResponse.output.choices[0];
  const annotation = choice?.message.annotations[0];

  const baseResponse: OpenAITranscriptionResponse = {
    text: choice?.message.content[0]?.text || '',
    task: 'transcribe',
    language: annotation?.language || 'unknown'
  };

  // 添加音频时长信息
  if (asrResponse.usage?.seconds) {
    baseResponse.duration = asrResponse.usage.seconds;
  }

  return baseResponse;
}

/**
 * 创建OpenAI详细响应格式
 */
export function createVerboseResponse(
  asrResponse: ASRResponse,
  processingTimeMs: number,
  uploadInfo?: {
    ossUrl: string;
    expireTime: Date;
    modelUsed: string;
  }
): OpenAIVerboseResponse {
  const baseResponse = convertToOpenAIFormat(asrResponse, processingTimeMs, uploadInfo);
  const choice = asrResponse.output.choices[0];
  const annotation = choice?.message.annotations[0];

  return {
    ...baseResponse,
    request_id: asrResponse.request_id,
    timestamp: new Date().toISOString(),
    processing_time_ms: processingTimeMs,
    ...(uploadInfo && {
      upload_info: {
        oss_url: uploadInfo.ossUrl,
        expire_time: uploadInfo.expireTime.toISOString(),
        model_used: uploadInfo.modelUsed
      }
    }),
    asr_metadata: {
      detected_language: annotation?.language || 'unknown',
      emotion: annotation?.emotion || 'unknown',
      finish_reason: choice?.finish_reason || 'unknown',
      usage: {
        input_tokens: asrResponse.usage.input_tokens_details?.text_tokens || 0,
        output_tokens: asrResponse.usage.output_tokens_details.text_tokens,
        audio_seconds: asrResponse.usage?.seconds || 0
      }
    }
  };
}

/**
 * 验证语言参数
 */
export function isValidLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}