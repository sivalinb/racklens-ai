import type { Metadata } from 'next';
import { ObservabilityDashboard } from '@/components/observability-dashboard';

export const metadata: Metadata = {
  title: 'Redfish Observability | RackLens AI',
  description:
    'Grafana-style rack and GPU observability built from Redfish telemetry.',
};

export default function DashboardPage() {
  return <ObservabilityDashboard />;
}
