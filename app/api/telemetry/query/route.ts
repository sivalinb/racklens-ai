import { queryTelemetry } from '@/lib/telemetry-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const payload = await queryTelemetry({
      dataCenter: params.get('data_center') ?? 'DEN-01',
      hall: params.get('hall') ?? 'Hall A',
      row: params.get('row') ?? 'Row 02',
      rack: params.get('rack') ?? 'R02',
      node: params.get('node') ?? 'U18',
      gpu: params.get('gpu') ?? 'GPU0',
    });
    return Response.json(payload, {
      headers: { 'Cache-Control': 'no-store', 'X-RackLens-Source': 'D1' },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Telemetry query failed',
        source: { mode: 'replay-fallback', persistent: false },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
