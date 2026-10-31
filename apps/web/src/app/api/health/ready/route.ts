import { NextResponse } from 'next/server';
import { validateEnv } from '@promise-keeper/runtime';

export async function GET() {
  try {
    const env = validateEnv();
    return NextResponse.json({
      status: 'ready',
      service: 'web',
      mode: env.PROCESSING_MODE,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'not_ready',
        error: 'Service readiness checks failed',
      },
      { status: 503 },
    );
  }
}
