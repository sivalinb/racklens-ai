import { queryEvaluationRuns } from '@/lib/telemetry-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await queryEvaluationRuns(), {
      headers: { 'Cache-Control': 'no-store', 'X-RackLens-Source': 'D1-Evals' },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Evaluation query failed',
        cloudConnected: false,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
