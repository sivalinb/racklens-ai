import type { Metadata } from 'next';
import { ArchitectureFlow } from '@/components/architecture-flow';

export const metadata: Metadata = {
  title: 'Architecture | RackLens AI',
  description:
    'Explore the animated RackLens architecture from Redfish collection through evidence-first AI, human review, observability and OCI evaluation.',
};

export default function ArchitecturePage() {
  return <ArchitectureFlow />;
}
