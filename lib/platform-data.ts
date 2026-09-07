export type WeekKey = 1 | 2 | 3 | 4 | 5;

export type RedfishCapability = {
  name: string;
  uri: string;
  mode: 'Read' | 'Event' | 'Guarded';
  status: 'Available' | 'Simulated';
  value: string;
  description: string;
};

export const WEEKS: Array<{
  id: WeekKey;
  name: string;
  product: string;
  outcome: string;
  technology: string;
}> = [
  {
    id: 1,
    name: 'Signal foundation',
    product: 'Redfish Capability Map',
    outcome:
      'Normalize inventory, health, thermals, power, logs, firmware and lifecycle events.',
    technology: 'DMTF Redfish · schema discovery · GET-only connector',
  },
  {
    id: 2,
    name: 'Evidence memory',
    product: 'Cited Incident Timeline',
    outcome:
      'Join Redfish events with GPU, facility and workload evidence without losing provenance.',
    technology: 'Hybrid RAG · structured retrieval · source citations',
  },
  {
    id: 3,
    name: 'Investigation',
    product: 'Reliability Copilot',
    outcome:
      'Rank three competing causes and propose a guarded operator playbook.',
    technology: 'Tool-using agents · causal ordering · human approval',
  },
  {
    id: 4,
    name: 'Trust laboratory',
    product: 'Replay & Evaluation Lab',
    outcome:
      'Measure scenario accuracy, citation validity, latency and safety before release.',
    technology: 'Golden replays · traces · deterministic evals · OpenTelemetry',
  },
  {
    id: 5,
    name: 'Model specialization',
    product: 'Adapter Foundry',
    outcome:
      'Prepare LoRA and QLoRA adapters only after operator-reviewed evidence clears the gate.',
    technology: 'PEFT · LoRA · 4-bit QLoRA · holdout evaluation',
  },
];

export const REDFISH_CAPABILITIES: RedfishCapability[] = [
  {
    name: 'Systems',
    uri: '/redfish/v1/Systems',
    mode: 'Read',
    status: 'Available',
    value: 'CPU, memory, boot & health',
    description: 'Computer-system inventory, state and aggregate health.',
  },
  {
    name: 'Chassis',
    uri: '/redfish/v1/Chassis',
    mode: 'Read',
    status: 'Available',
    value: 'Thermal, power & sensors',
    description: 'Physical rack and server environmental envelope.',
  },
  {
    name: 'Managers',
    uri: '/redfish/v1/Managers',
    mode: 'Read',
    status: 'Available',
    value: 'BMC inventory & health',
    description: 'Management controller identity, status and connectivity.',
  },
  {
    name: 'TelemetryService',
    uri: '/redfish/v1/TelemetryService',
    mode: 'Read',
    status: 'Simulated',
    value: 'Metric reports & definitions',
    description: 'High-frequency telemetry and metric report definitions.',
  },
  {
    name: 'EventService',
    uri: '/redfish/v1/EventService',
    mode: 'Event',
    status: 'Simulated',
    value: 'Subscriptions & events',
    description: 'Asynchronous lifecycle, health and alert event stream.',
  },
  {
    name: 'LogService',
    uri: '*/LogServices',
    mode: 'Read',
    status: 'Simulated',
    value: 'SEL & lifecycle logs',
    description: 'System event, audit and diagnostic records.',
  },
  {
    name: 'UpdateService',
    uri: '/redfish/v1/UpdateService',
    mode: 'Guarded',
    status: 'Simulated',
    value: 'Firmware inventory',
    description:
      'Firmware versions and update readiness; writes remain disabled.',
  },
  {
    name: 'PCIeDevice',
    uri: '*/PCIeDevices',
    mode: 'Read',
    status: 'Available',
    value: 'GPU & accelerator inventory',
    description: 'Accelerator identity, links and health relationships.',
  },
  {
    name: 'NetworkAdapter',
    uri: '*/NetworkAdapters',
    mode: 'Read',
    status: 'Simulated',
    value: 'NIC inventory & ports',
    description: 'Host-network inventory and fabric attachment context.',
  },
  {
    name: 'AccountService',
    uri: '/redfish/v1/AccountService',
    mode: 'Read',
    status: 'Available',
    value: 'Policy posture',
    description: 'Read-only security policy and account-service posture.',
  },
  {
    name: 'Reset',
    uri: '*/Actions/ComputerSystem.Reset',
    mode: 'Guarded',
    status: 'Simulated',
    value: 'Operator-approved action',
    description: 'Proposed in playbooks but never executed by the public demo.',
  },
  {
    name: 'CompositionService',
    uri: '/redfish/v1/CompositionService',
    mode: 'Guarded',
    status: 'Simulated',
    value: 'Composable infrastructure',
    description: 'Future guarded workflow for resource composition.',
  },
];

export const INCIDENTS = [
  {
    id: 'cooling',
    name: 'Cooling-path imbalance',
    severity: 'P1',
    rack: 'R02',
    lead: 'Inlet temperature',
    delta: '+5.6°C',
    cause: 'Blocked cold-air delivery',
    confidence: 91,
    evidence: ['Chassis Thermal', 'Facility CRAC', 'GPU clock'],
  },
  {
    id: 'power',
    name: 'Power-cap event',
    severity: 'P1',
    rack: 'R03',
    lead: 'Power limit',
    delta: '-18%',
    cause: 'Rack power envelope exceeded',
    confidence: 89,
    evidence: ['Chassis Power', 'PDU branch', 'GPU throttle'],
  },
  {
    id: 'pcie',
    name: 'PCIe degradation',
    severity: 'P2',
    rack: 'R01',
    lead: 'Correctable errors',
    delta: '42/min',
    cause: 'Degrading GPU link',
    confidence: 87,
    evidence: ['PCIeDevice', 'System log', 'Workload retry'],
  },
  {
    id: 'firmware',
    name: 'Firmware regression',
    severity: 'P1',
    rack: 'R04',
    lead: 'Update event',
    delta: 'v2.8.4',
    cause: 'Fan policy changed after update',
    confidence: 93,
    evidence: ['UpdateService', 'EventService', 'Fan telemetry'],
  },
  {
    id: 'nvlink',
    name: 'NVLink degradation',
    severity: 'P2',
    rack: 'R02',
    lead: 'Replay errors',
    delta: '7.4×',
    cause: 'Interconnect path instability',
    confidence: 88,
    evidence: ['PCIeDevice', 'DCGM fabric', 'Collective latency'],
  },
  {
    id: 'certificate',
    name: 'Certificate drift',
    severity: 'P3',
    rack: 'R01',
    lead: 'Expiry window',
    delta: '9 days',
    cause: 'BMC trust certificate aging',
    confidence: 96,
    evidence: ['Managers', 'AccountService', 'EventService'],
  },
] as const;

export const SOURCES = [
  {
    name: 'DMTF Redfish',
    type: 'Specification + emulator',
    url: 'https://www.dmtf.org/standards/redfish',
  },
  {
    name: 'Sushy Tools',
    type: 'Redfish emulator',
    url: 'https://docs.openstack.org/sushy-tools/latest/',
  },
  {
    name: 'NVIDIA DCGM Exporter',
    type: 'GPU telemetry',
    url: 'https://github.com/NVIDIA/dcgm-exporter',
  },
  {
    name: 'Alibaba GPU Cluster Trace',
    type: 'Public workload trace',
    url: 'https://github.com/alibaba/clusterdata',
  },
  {
    name: 'OpenTelemetry Demo',
    type: 'Distributed traces',
    url: 'https://opentelemetry.io/docs/demo/',
  },
];
