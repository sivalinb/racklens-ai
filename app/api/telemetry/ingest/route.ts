import { ingestTelemetry } from '@/lib/telemetry-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      samples?: Parameters<typeof ingestTelemetry>[1];
    };
    if (!Array.isArray(body.samples))
      throw new Error('Request body must contain samples[]');
    return Response.json(await ingestTelemetry(request, body.samples), {
      status: 202,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Telemetry ingestion failed';
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.includes('locked')
        ? 503
        : 400;
    return Response.json({ error: message }, { status });
  }
}
