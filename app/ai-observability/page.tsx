import type { Metadata } from 'next';
import { LangSmithObservabilityDashboard } from '@/components/langsmith-observability-dashboard';

export const metadata: Metadata = {
  title: 'AI Observability | RackLens AI',
  description:
    'LangSmith-shaped AI trace, evaluation, cost and hardware correlation observability for RackLens.',
};

export default function AiObservabilityPage() {
  return <LangSmithObservabilityDashboard />;
}
