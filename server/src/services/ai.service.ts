import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env';
import type { AiAssessment, IEmergency } from '../models/Emergency';
import { storageService } from './storage.service';
import { EMERGENCY_CATEGORIES, URGENCIES } from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { cleanText } from '../utils/text';

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const assessmentResponseSchema = z.object({
  category: z.enum(EMERGENCY_CATEGORIES),
  suggestedUrgency: z.enum(URGENCIES),
  possibleHazards: z.array(z.string().trim().min(1).max(200)).max(10),
  suggestedResources: z.array(z.string().trim().min(1).max(200)).max(12),
  reasoningSummary: z.string().trim().min(1).max(2000),
  imageAuthenticityConfidence: z.number().min(0).max(1).optional(),
  peopleCountEstimate: z.number().int().min(0).max(100_000).optional(),
});

export interface AiAssessmentResult extends Omit<AiAssessment, 'analyzedAt'> {
  analyzedAt: Date;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new ApiError(
      503,
      'AI analysis is not configured on this server. Set GEMINI_API_KEY to enable it.',
      'AI_NOT_CONFIGURED',
    );
  }
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

function loadLocalImage(mediaUrl?: string) {
  if (!mediaUrl) return null;
  const resolved = storageService.resolvePublicUrl(mediaUrl);
  if (!resolved) return null;
  const extension = path.extname(resolved).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES[extension];
  if (!mimeType) return null;

  const size = fs.statSync(resolved).size;
  if (size > env.MAX_UPLOAD_MB * 1024 * 1024) return null;

  return {
    mimeType,
    data: fs.readFileSync(resolved).toString('base64'),
  };
}

function buildPrompt(emergency: IEmergency, hasImage: boolean): string {
  const report = {
    ticketId: emergency.ticketId,
    title: emergency.title,
    description: emergency.description,
    categories: emergency.category,
    reportedUrgency: emergency.urgency,
    peopleCount: emergency.peopleCount,
    address: emergency.address ?? 'Not provided',
    landmark: emergency.landmark ?? 'Not provided',
    coordinates: emergency.location.coordinates,
    hasAttachedImage: hasImage,
  };

  return [
    'You are a decision-support assistant for a disaster emergency operations centre.',
    'Assess the citizen report below and return a structured triage suggestion.',
    'You must NOT verify, approve, reject, close, or dispatch anything. Only a human dispatcher may do that.',
    'If the report is ambiguous, inconsistent, or lacks evidence, set requiresHumanReview to true and be conservative.',
    'Do not invent facts that are not present in the report or the attached image.',
    hasImage
      ? 'The attached image is evidence supplied by the reporter. Assess visible hazards and estimate image authenticity confidence, but do not treat it as independently verified.'
      : 'No image was supplied. Do not provide an imageAuthenticityConfidence value.',
    '',
    'Report JSON:',
    JSON.stringify(report, null, 2),
  ].join('\n');
}

export async function analyzeEmergencyReport(emergency: IEmergency): Promise<AiAssessmentResult> {
  const ai = getClient();
  const image = loadLocalImage(emergency.media?.url ?? emergency.mediaUrl);

  const properties: Record<string, unknown> = {
    category: { type: Type.STRING, enum: [...EMERGENCY_CATEGORIES] },
    suggestedUrgency: { type: Type.STRING, enum: [...URGENCIES] },
    possibleHazards: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedResources: { type: Type.ARRAY, items: { type: Type.STRING } },
    reasoningSummary: { type: Type.STRING },
    peopleCountEstimate: { type: Type.INTEGER },
  };
  if (image) {
    properties.imageAuthenticityConfidence = { type: Type.NUMBER };
  }

  const parts: Array<Record<string, unknown>> = [{ text: buildPrompt(emergency, Boolean(image)) }];
  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  let rawText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        abortSignal: controller.signal,
        temperature: 0.2,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties,
          required: [
            'category',
            'suggestedUrgency',
            'possibleHazards',
            'suggestedResources',
            'reasoningSummary',
            'peopleCountEstimate',
          ],
        },
      },
    });
    rawText = response.text;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(503, 'AI analysis timed out. Try again shortly.', 'AI_TIMEOUT');
    }
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[ai] Gemini request failed:', message.slice(0, 300));
    if (/\b429\b|rate|quota/i.test(message)) {
      throw new ApiError(503, 'AI analysis is temporarily rate limited. Try again later.', 'AI_RATE_LIMITED');
    }
    throw new ApiError(503, 'AI analysis is temporarily unavailable.', 'AI_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }

  if (!rawText) {
    throw new ApiError(503, 'AI analysis returned no usable output.', 'AI_INVALID_RESPONSE');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new ApiError(503, 'AI analysis returned malformed output.', 'AI_INVALID_RESPONSE');
  }

  const parsed = assessmentResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.warn('[ai] Gemini output failed schema validation:', parsed.error.issues[0]?.message);
    throw new ApiError(503, 'AI analysis returned malformed output.', 'AI_INVALID_RESPONSE');
  }

  return {
    category: parsed.data.category,
    suggestedUrgency: parsed.data.suggestedUrgency,
    possibleHazards: parsed.data.possibleHazards.map((item) => cleanText(item)),
    suggestedResources: parsed.data.suggestedResources.map((item) => cleanText(item)),
    reasoningSummary: cleanText(parsed.data.reasoningSummary),
    requiresHumanReview: true,
    imageAuthenticityConfidence: parsed.data.imageAuthenticityConfidence,
    peopleCountEstimate: parsed.data.peopleCountEstimate,
    model: env.GEMINI_MODEL,
    analyzedAt: new Date(),
  };
}
