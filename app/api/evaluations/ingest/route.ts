import { ingestEvaluation, type EvaluationRun } from '@/lib/telemetry-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { run?: EvaluationRun };
    if (!body.run) throw new Error('Request body must contain run');
    return Response.json(await ingestEvaluation(request, body.run), {
      status: 202,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Evaluation ingestion failed';
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.includes('locked')
        ? 503
        : 400;
    return Response.json({ error: message }, { status });
  }
}
