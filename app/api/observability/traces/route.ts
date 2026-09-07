import { queryAiTraceSummary } from '@/lib/telemetry-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await queryAiTraceSummary(), {
      headers: { 'Cache-Control': 'no-store', 'X-RackLens-Source': 'D1-OTel' },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Trace query failed',
        source: { mode: 'replay-fallback', persistent: false },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
