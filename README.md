# Qwen3-ASR

OpenAI-compatible Speech-to-Text API powered by Alibaba Cloud's Qwen3-ASR model, deployed on Cloudflare Workers.

## 🌟 Features

- **OpenAI-compatible API**: Drop-in replacement for OpenAI's Whisper API (`/v1/audio/transcriptions`)
- **18 Language Support**: Chinese (zh), Cantonese (yue), English (en), Japanese (ja), German (de), Korean (ko), Russian (ru), French (fr), Portuguese (pt), Arabic (ar), Italian (it), Spanish (es), Hindi (hi), Indonesian (id), Thai (th), Turkish (tr), Ukrainian (uk), Vietnamese (vi)
- **Multiple Response Formats**: JSON, verbose JSON, plain text, and SRT subtitles
- **Extensive Media Support**: Audio (AAC, AMR, FLAC, MP3, M4A, OGG, Opus, WAV, WebM, WMA) and Video (AVI, FLV, MKV, MOV, MP4, MPEG, WebM, WMV)
- **Emotion Detection**: Automatically detects speaker emotion (surprised, neutral, happy, sad, disgusted, angry, fearful)
- **Edge Deployment**: Fast, globally distributed via Cloudflare Workers
- **Serverless Architecture**: Zero server management required

## 🚀 Quick Start

### Prerequisites

- [Cloudflare Account](https://dash.cloudflare.com/sign-up)
- [Alibaba Cloud DashScope API Key](https://dashscope.console.aliyun.com/)
- Node.js 18+ and pnpm (or npm)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/qwen3-asr.git
   cd qwen3-asr
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure API credentials**
   
   Create a `.dev.vars` file for local development:
   ```bash
   DASHSCOPE_API_KEY=your_dashscope_api_key_here
   ```

4. **Set production secrets** (for deployment)
   ```bash
   wrangler secret put DASHSCOPE_API_KEY
   ```

### Local Development

```bash
pnpm dev
```

The API will be available at `http://localhost:8787`

### Deployment

```bash
pnpm deploy
```

Your API will be deployed to Cloudflare Workers with a URL like:
`https://qwen3-asr.your-subdomain.workers.dev`

## 📖 API Usage

### Basic Request

```bash
curl -X POST https://qwen3-asr.your-subdomain.workers.dev/v1/audio/transcriptions \
  -F "file=@audio.mp3" \
  -F "model=qwen3-asr-flash"
```

### With Language Specification

```bash
curl -X POST https://qwen3-asr.your-subdomain.workers.dev/v1/audio/transcriptions \
  -F "file=@audio.mp3" \
  -F "model=qwen3-asr-flash" \
  -F "language=en"
```

### Response Formats

#### Default JSON
```bash
curl -X POST https://qwen3-asr.your-subdomain.workers.dev/v1/audio/transcriptions \
  -F "file=@audio.mp3" \
  -F "model=qwen3-asr-flash" \
  -F "response_format=json"
```

Response:
```json
{
  "text": "Hello, world!",
  "task": "transcribe",
  "language": "en",
  "duration": 3.5,
  "upload_info": {
    "oss_url": "oss://...",
    "expire_time": "2025-11-30T12:00:00.000Z",
    "model_used": "qwen3-asr-flash"
  },
  "processing_time_ms": 1245
}
```

#### Verbose JSON
```bash
curl -X POST https://qwen3-asr.your-subdomain.workers.dev/v1/audio/transcriptions \
  -F "file=@audio.mp3" \
  -F "model=qwen3-asr-flash" \
  -F "response_format=verbose_json"
```

Response includes additional metadata:
```json
{
  "text": "Hello, world!",
  "task": "transcribe",
  "language": "en",
  "duration": 3.5,
  "request_id": "...",
  "timestamp": "2025-11-28T12:00:00.000Z",
  "processing_time_ms": 1245,
  "asr_metadata": {
    "detected_language": "en",
    "emotion": "neutral",
    "finish_reason": "stop",
    "usage": {
      "input_tokens": 0,
      "output_tokens": 25,
      "audio_seconds": 3.5
    }
  }
}
```

#### Plain Text
```bash
curl -X POST https://qwen3-asr.your-subdomain.workers.dev/v1/audio/transcriptions \
  -F "file=@audio.mp3" \
  -F "model=qwen3-asr-flash" \
  -F "response_format=text"
```

Response:
```
Hello, world!
```

#### SRT Subtitles
```bash
curl -X POST https://qwen3-asr.your-subdomain.workers.dev/v1/audio/transcriptions \
  -F "file=@audio.mp3" \
  -F "model=qwen3-asr-flash" \
  -F "response_format=srt"
```

Response:
```
1
00:00:00,000 --> 00:00:03,000
Hello, world!
```

## 🛠️ Configuration

### Environment Variables

Configure via `wrangler.jsonc` and Cloudflare secrets:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DASHSCOPE_API_KEY` | Alibaba Cloud DashScope API Key | - | ✅ |
| `DEFAULT_MODEL_NAME` | Default ASR model to use | `qwen3-asr-flash` | ❌ |

### Supported Languages

| Code | Language | Code | Language |
|------|----------|------|----------|
| `zh` | Chinese | `ar` | Arabic |
| `yue` | Cantonese | `it` | Italian |
| `en` | English | `es` | Spanish |
| `ja` | Japanese | `hi` | Hindi |
| `de` | German | `id` | Indonesian |
| `ko` | Korean | `th` | Thai |
| `ru` | Russian | `tr` | Turkish |
| `fr` | French | `uk` | Ukrainian |
| `pt` | Portuguese | `vi` | Vietnamese |

### Supported File Formats

**Audio**: AAC, AMR, FLAC, MP3, M4A, OGG, Opus, WAV, WebM, WMA

**Video**: AVI, FLV, MKV, MOV, MP4, MPEG, WebM, WMV

**Maximum File Size**: 100MB

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /v1/audio/transcriptions
       ▼
┌─────────────────────────────┐
│   Cloudflare Workers        │
│   (Hono Framework)          │
├─────────────────────────────┤
│ 1. Validate file            │
│ 2. Upload to OSS            │
│ 3. Call Qwen3-ASR API       │
│ 4. Convert to OpenAI format │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Alibaba Cloud DashScope     │
│ (Qwen3-ASR Model)           │
└─────────────────────────────┘
```

## 📁 Project Structure

```
qwen3-asr/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── types.ts              # TypeScript type definitions
│   └── services/
│       ├── asrService.ts     # Qwen3-ASR API integration
│       └── uploadService.ts  # File upload to OSS
├── wrangler.jsonc            # Cloudflare Workers configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

## 🔧 Development

### Scripts

```bash
# Start local development server
pnpm dev

# Deploy to Cloudflare Workers
pnpm deploy

# Generate TypeScript types
pnpm cf-typegen
```

### Tech Stack

- **Framework**: [Hono](https://hono.dev/) - Ultrafast web framework for edge
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless edge computing
- **ASR Model**: [Qwen3-ASR](https://help.aliyun.com/zh/model-studio/developer-reference/qwen3-asr-api/) - Alibaba Cloud's speech recognition model
- **Language**: TypeScript

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📮 Support

For issues and questions:
- Create an issue in this repository
- Refer to [Alibaba Cloud DashScope Documentation](https://help.aliyun.com/zh/model-studio/)
- Check [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

## 🙏 Acknowledgments

- [Alibaba Cloud](https://www.alibabacloud.com/) for Qwen3-ASR model
- [Cloudflare](https://www.cloudflare.com/) for Workers platform
- [Hono](https://hono.dev/) for the excellent web framework
