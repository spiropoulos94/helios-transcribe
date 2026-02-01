import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { transcriptionStore } from '@/lib/transcription-store';

/**
 * ElevenLabs webhook event structure (actual payload format)
 */
interface TranscriptionWebhookEventData {
  request_id: string;
  transcription: {
    language_code: string;
    language_probability: number;
    text: string;
    words: Array<{
      text: string;
      start: number;
      end: number;
      type: "word" | "spacing";
      speaker_id: string | null;
      logprob: number | null;
      characters: unknown | null;
    }>;
    additional_formats: Array<{
      requested_format: string;
      file_extension: string;
      content_type: string;
      is_base64_encoded: boolean;
      content: string;
    }>;
    trascription_id: string;
  };
  character_cost: number;
}

/**
 * Wrapper for the webhook event returned by ElevenLabs SDK
 */
interface ElevenLabsWebhookEvent {
  type: string;
  data: TranscriptionWebhookEventData;
}

/**
 * POST /api/webhooks/elevenlabs
 * Webhook endpoint for ElevenLabs speech-to-text transcription callbacks
 *
 * This endpoint receives notifications when async transcription jobs complete.
 * Configure this URL in your ElevenLabs account at:
 * https://elevenlabs.io/app/settings/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get the signature from headers
    const signature = request.headers.get('elevenlabs-signature');

    if (!signature) {
      console.error('[ElevenLabs Webhook] Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Get the raw body as text for signature verification
    const payload = await request.text();

    // Verify the webhook signature using ElevenLabs SDK
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[ElevenLabs Webhook] ELEVENLABS_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Initialize client for webhook verification
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Verify and construct the event
    const event = await client.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    // Handle speech-to-text completion event
    // ElevenLabs can send different event type names
    if (
      event.type === 'speech_to_text_transcription' ||
      event.type === 'speech_to_text.completed' ||
      event.type === 'speech_to_text.transcription'
    ) {
      const webhookEvent = event as ElevenLabsWebhookEvent;
      const { request_id, transcription } = webhookEvent.data;

      // Normalize the request ID for consistent storage lookup
      const normalizedId = request_id.toLowerCase();

      // Store the transcription result as-is (no conversion needed)
      transcriptionStore.complete(normalizedId, {
        transcription,
      });

      // Return success response
      return NextResponse.json({
        received: true,
        requestId: request_id,
        type: event.type,
      });
    }

    // Handle other event types
    return NextResponse.json({
      received: true,
      type: event.type,
    });

  } catch (error) {
    console.error('[ElevenLabs Webhook] Error processing webhook:', error);

    // Return 401 for signature verification failures (client error - no retry)
    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Return 500 for server errors (ElevenLabs will retry)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/elevenlabs
 * Health check endpoint to verify webhook is accessible
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'ElevenLabs Speech-to-Text Webhook',
    configured: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
  });
}
