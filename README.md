# Qwen3 ASR Service

一个基于Cloudflare Workers的OpenAI兼容音频转录服务。

## API 接口

### POST `/v1/audio/transcriptions`

OpenAI兼容的音频转录接口。

#### 请求格式

支持 `multipart/form-data` 格式：

| 参数 | 类型 | 描述 |
|------|------|------|
| file | File | 音频文件 (必需) |
| model | string | 模型名称 (可选) |
| language | string | 语言代码 (可选，默认: en) |
| response_format | string | 响应格式 (可选，支持: json, text, srt, verbose_json) |
| temperature | string | 温度参数 (可选) |

#### 响应格式

根据 `response_format` 参数返回不同格式：

**JSON格式 (默认):**
```json
{
  "text": "This is a mock transcription. The actual transcription logic will be implemented later.",
  "task": "transcribe",
  "language": "en",
  "duration": 120.5,
  "words": [
    { "word": "This", "start": 0.0, "end": 0.5 },
    { "word": "is", "start": 0.6, "end": 0.8 },
    { "word": "a", "start": 0.9, "end": 1.0 },
    { "word": "mock", "start": 1.1, "end": 1.5 },
    { "word": "transcription", "start": 1.6, "end": 2.5 }
  ]
}
```

**Text格式:**
```
This is a mock transcription. The actual transcription logic will be implemented later.
```

**SRT格式:**
```
1
00:00:00,000 --> 00:00:02,500
This is a mock transcription. The actual transcription logic will be implemented later.
```

**Verbose JSON格式:**
```json
{
  "text": "This is a mock transcription. The actual transcription logic will be implemented later.",
  "task": "transcribe",
  "language": "en",
  "duration": 120.5,
  "words": [...],
  "request_id": "mock_1234567890",
  "timestamp": "2025-11-28T00:00:00.000Z"
}
```

## 配置

### 环境变量

在使用前，需要配置以下环境变量：

1. **DASHSCOPE_API_KEY** (必需): DashScope API密钥
   - 建议作为Secret设置：`wrangler secret put DASHSCOPE_API_KEY`
   - 或在本地开发时创建 `.dev.vars` 文件

2. **DEFAULT_MODEL_NAME** (可选): 默认模型名称
   - 默认值: `qwen-vl-plus`
   - 可在 `wrangler.jsonc` 中配置

### 配置示例

**wrangler.jsonc 配置:**
```json
{
  "name": "qwen3-asr",
  "vars": {
    "DEFAULT_MODEL_NAME": "qwen-vl-plus"
  }
}
```

**本地开发 (.dev.vars):**
```
DASHSCOPE_API_KEY=your_api_key_here
DEFAULT_MODEL_NAME=qwen-vl-plus
```

## 开发

### 本地开发
```bash
npm run dev
```

### 部署
```bash
npm run deploy
```

### 设置API密钥
```bash
# 设置为Secret（推荐用于生产环境）
wrangler secret put DASHSCOPE_API_KEY

# 或者设置为普通变量（仅限测试环境）
wrangler secret put DASHSCOPE_API_KEY
```

### 类型生成
```bash
npm run cf-typegen
```

## 依赖

- **Hono**: 轻量级Web框架
- **Cloudflare Workers**: 无服务器计算平台

## 功能特性

- ✅ **OpenAI兼容接口**: 完全兼容OpenAI转录API规范
- ✅ **文件上传**: 自动上传音频文件到阿里云OSS临时存储
- ✅ **多种响应格式**: 支持JSON、Text、SRT、Verbose JSON格式
- ✅ **错误处理**: 完善的错误处理和日志记录
- ✅ **文件验证**: 支持文件类型和大小验证
- ✅ **性能监控**: 记录处理时间和上传信息

## 使用示例

### cURL 请求示例

```bash
# 基本转录请求
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/audio/transcriptions" \
  -H "Authorization: Bearer your-api-key" \
  -F "file=@/path/to/your/audio.mp3" \
  -F "model=qwen-vl-plus" \
  -F "language=zh" \
  -F "response_format=json"

# 获取详细响应
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/audio/transcriptions" \
  -H "Authorization: Bearer your-api-key" \
  -F "file=@/path/to/your/audio.mp3" \
  -F "model=qwen-vl-plus" \
  -F "response_format=verbose_json"
```

### Python 请求示例

```python
import requests

url = "https://your-worker.your-subdomain.workers.dev/v1/audio/transcriptions"
headers = {"Authorization": "Bearer your-api-key"}

with open("audio.mp3", "rb") as f:
    files = {"file": f}
    data = {
        "model": "qwen-vl-plus",
        "language": "zh",
        "response_format": "json"
    }

    response = requests.post(url, headers=headers, files=files, data=data)
    result = response.json()

    print(f"转录结果: {result['text']}")
    print(f"检测到的语言: {result['language']}")
    if 'upload_info' in result:
        print(f"上传的OSS URL: {result['upload_info']['oss_url']}")
```

## ASR服务说明

本服务使用通义千问3-ASR-Flash模型进行语音识别：

### 支持的语言

- **zh**: 中文（普通话、四川话、闽南语、吴语）
- **yue**: 粤语
- **en**: 英文
- **ja**: 日语
- **de**: 德语
- **ko**: 韩语
- **ru**: 俄语
- **fr**: 法语
- **pt**: 葡萄牙语
- **ar**: 阿拉伯语
- **it**: 意大利语
- **es**: 西班牙语
- **hi**: 印地语
- **id**: 印尼语
- **th**: 泰语
- **tr**: 土耳其语
- **uk**: 乌克兰语
- **vi**: 越南语

### 功能特性

- **ITN功能**: 默认启用逆文本标准化，提高识别结果的可读性
- **情感识别**: 自动检测音频中的情感（平静、愉快、悲伤等）
- **音频时长计算**: 自动计算并返回音频时长
- **上下文增强**: 支持提供背景文本提高识别准确率（预留接口）

## 注意事项

- **文件上传有效期**: 上传的音频文件有效期48小时
- **文件大小限制**: 最大100MB
- **支持文件类型**: 音频和视频格式
- **上传凭证限流**: 上传凭证接口限流100 QPS，生产环境建议使用阿里云OSS
- **ASR服务区域**: 固定使用中国区域DashScope服务
- **API密钥**: 需要有效的DashScope API密钥
