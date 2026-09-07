import type { Metadata } from 'next';
import { CloudLab } from '@/components/cloud-lab';

export const metadata: Metadata = {
  title: 'OCI Reliability Lab | RackLens AI',
  description:
    'Cloud-backed Redfish telemetry, evaluation automation and evidence-first AI operations on Oracle Cloud Always Free infrastructure.',
};

export default function CloudLabPage() {
  return <CloudLab />;
}
