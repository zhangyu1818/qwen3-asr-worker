# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
```bash
# Start local development server
pnpm dev    # or pnpm start
# Access at: http://localhost:8787

# Generate TypeScript types for Cloudflare Workers
pnpm cf-typegen
```

### Deployment
```bash
# Deploy to Cloudflare Workers
pnpm deploy

# Set production secrets (required for deployment)
wrangler secret put DASHSCOPE_API_KEY
```

### Environment Setup
- Local development: Create `.dev.vars` with `DASHSCOPE_API_KEY=your_api_key_here`
- Production: Use `wrangler secret put` to securely store API keys

## Architecture Overview

This is a Cloudflare Workers application that provides an OpenAI-compatible audio transcription API using Alibaba Cloud's Qwen3-ASR model.

### Core Flow
1. **File Upload**: Client uploads audio/video via multipart form data to `/v1/audio/transcriptions`
2. **OSS Storage**: Files are uploaded to Alibaba Cloud OSS using temporary signed URLs
3. **ASR Processing**: Qwen3-ASR processes the audio from the OSS URL
4. **Response Formatting**: Results are converted to OpenAI-compatible format based on requested response type

### Key Services
- **ASR Service** (`src/services/asrService.ts`): Handles Qwen3-ASR API integration with DashScope
- **Upload Service** (`src/services/uploadService.ts`): Manages file uploads to Alibaba Cloud OSS
- **Main App** (`src/index.ts`): Hono.js web framework handling OpenAI-compatible endpoints

### Important Integration Details

**DashScope API Integration**:
- Endpoint: `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- Requires `X-DashScope-OssResourceResolve: enable` header for OSS URL processing
- Uses `qwen3-asr-flash` model by default (configurable via `DEFAULT_MODEL_NAME`)

**File Upload Process**:
1. Get upload policy from DashScope API
2. Upload file directly to Alibaba Cloud OSS with signed URL
3. Generate `oss://` URL for ASR processing
4. Files expire after 48 hours by default

**OpenAI API Compatibility**:
- Endpoint: `POST /v1/audio/transcriptions`
- Supported parameters: `file`, `model`, `language`, `response_format`, `temperature`
- Response formats: `json`, `verbose_json`, `text`, `srt`

### Configuration
- **Default Model**: Configured in `wrangler.jsonc` as `DEFAULT_MODEL_NAME` (default: "qwen3-asr-flash")
- **Languages**: Supports 18 languages including Chinese, English, Japanese, Korean, and more
- **File Formats**: Extensive audio/video support (AAC, MP3, WAV, MP4, etc.) with 100MB limit
- **Response Features**: Emotion detection, language auto-detection, ITN (Inverse Text Normalization)

### Key Files Structure
```
src/
├── index.ts              # Main Hono app with OpenAI-compatible routes
├── types.ts              # TypeScript type definitions
└── services/
    ├── asrService.ts     # Qwen3-ASR API integration
    └── uploadService.ts  # OSS file upload logic
```

## Dependencies
- **Hono.js**: Ultrafast web framework for Cloudflare Workers edge computing
- **Alibaba Cloud DashScope**: Qwen3-ASR model for speech recognition
- **Alibaba Cloud OSS**: Temporary file storage for audio processing
- **Cloudflare Workers**: Serverless edge deployment platform