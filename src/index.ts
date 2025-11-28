import { Hono } from "hono";
import { uploadFileAndGetUrl } from "./services/uploadService";
import {
  callASRService,
  createVerboseResponse,
  convertToOpenAIFormat,
  isValidLanguage
} from "./services/asrService";
import type { Env } from "./types";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Configuration constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "video/mp4",
  "video/mpeg",
  "video/quicktime"
];

/**
 * Validate uploaded file
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File too large" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "File type not allowed" };
  }

  return { valid: true };
}

// OpenAI compatible transcription endpoint
app.post("/v1/audio/transcriptions", async (c) => {
  const startTime = Date.now();

  try {
    // Get form data
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const model = formData.get("model") as string;
    const language = formData.get("language") as string;
    const responseFormat = formData.get("response_format") as string;
    const temperature = formData.get("temperature") as string;

    // Validate API key
    if (!c.env.DASHSCOPE_API_KEY) {
      return c.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return c.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Validate language parameter if provided
    let validatedLanguage: string | undefined;
    if (language && language !== '') {
      if (!isValidLanguage(language)) {
        return c.json(
          {
            error: "Unsupported language",
            supported_languages: [
              "zh", "yue", "en", "ja", "de", "ko", "ru", "fr",
              "pt", "ar", "it", "es", "hi", "id", "th", "tr", "uk", "vi"
            ]
          },
          { status: 400 }
        );
      }
      validatedLanguage = language;
    }

    // Log received parameters (for debugging)
    console.log("Transcription request:", {
      file: file?.name || "no file",
      model,
      language: validatedLanguage,
      responseFormat,
      temperature,
      fileSize: file.size,
      fileType: file.type,
    });

    // Upload file and get URL
    const modelName = model || c.env.DEFAULT_MODEL_NAME || "qwen-vl-plus";
    const uploadResult = await uploadFileAndGetUrl(
      c.env.DASHSCOPE_API_KEY,
      modelName,
      file
    );

    console.log("File uploaded successfully:", {
      ossUrl: uploadResult.ossUrl,
      expireTime: uploadResult.expireTime.toISOString(),
    });

    // Call ASR service
    const asrResponse = await callASRService(c.env, {
      audioUrl: uploadResult.ossUrl,
      language: validatedLanguage as any,
      enableITN: true // Enable ITN by default for better results
    });

    // Convert ASR response to OpenAI format
    const processingTimeMs = Date.now() - startTime;
    const openAIResponse = convertToOpenAIFormat(asrResponse, processingTimeMs);

    // Create upload info for responses
    const uploadInfo = {
      ossUrl: uploadResult.ossUrl,
      expireTime: uploadResult.expireTime,
      modelUsed: modelName
    };

    // Return response based on format
    if (responseFormat === "text") {
      return c.text(openAIResponse.text);
    } else if (responseFormat === "srt") {
      // Generate simple SRT format
      const duration = openAIResponse.duration || 0;
      const srtContent = `1\n00:00:00,000 --> 00:00:${Math.floor(duration).toString().padStart(2, '0')},000\n${openAIResponse.text}`;
      return c.text(srtContent);
    } else if (responseFormat === "verbose_json") {
      const verboseResponse = createVerboseResponse(
        asrResponse,
        processingTimeMs,
        uploadInfo
      );
      return c.json(verboseResponse);
    } else if (responseFormat === "json" || responseFormat === undefined || responseFormat === '') {
      // Default JSON format - include upload info for better debugging
      const jsonResponse = {
        ...openAIResponse,
        upload_info: {
          oss_url: uploadInfo.ossUrl,
          expire_time: uploadInfo.expireTime.toISOString(),
          model_used: uploadInfo.modelUsed
        },
        processing_time_ms: processingTimeMs
      };
      return c.json(jsonResponse);
    } else {
      // Unsupported format
      return c.json(
        {
          error: "Unsupported response_format",
          supported_formats: ["json", "text", "srt", "verbose_json"]
        },
        { status: 400 }
      );
    }

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error("Transcription request failed:", {
      error: errorMessage,
      processingTime: processingTimeMs,
      timestamp: new Date().toISOString(),
    });

    return c.json(
      {
        error: errorMessage,
        processing_time_ms: processingTimeMs,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// Export the Hono app
export default app;
