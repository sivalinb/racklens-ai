export type ScenarioKey = 'cooling' | 'power' | 'pcie' | 'healthy';

export type Scenario = {
  label: string;
  short: string;
  finding: string;
  summary: string;
  confidence: number;
  rack: string;
  severity: 'Healthy' | 'Warning' | 'Critical';
  accent: string;
  hypotheses: { title: string; confidence: number }[];
  evidence: {
    id: string;
    type: string;
    resource: string;
    observation: string;
    value: string;
  }[];
  recommendation: string;
  metrics: {
    power: number[];
    thermal: number[];
    traffic: number[];
    clock: number[];
  };
};

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  cooling: {
    label: 'Cooling imbalance',
    short: 'Thermal rise → clock loss',
    finding: 'Cooling-path imbalance at R02',
    summary:
      'R02 inlet temperature rises 94 seconds before GPU clocks fall across four nodes. Rack power remains inside its peer envelope.',
    confidence: 91,
    rack: 'R02',
    severity: 'Warning',
    accent: '#ffb45e',
    hypotheses: [
      { title: 'Cooling-path imbalance', confidence: 91 },
      { title: 'Workload thermal saturation', confidence: 47 },
      { title: 'Sensor or firmware drift', confidence: 24 },
    ],
    evidence: [
      {
        id: 'R-01',
        type: 'Redfish',
        resource: 'R02 / Thermal',
        observation: 'Peak inlet is 5.6°C above peer racks',
        value: '29.8°C',
      },
      {
        id: 'G-01',
        type: 'GPU',
        resource: 'R02 / U17–U20',
        observation: 'Average accelerator clock reduced 11%',
        value: '1,615 MHz',
      },
      {
        id: 'P-01',
        type: 'Power',
        resource: 'R02 / Power',
        observation: 'Power remains inside the expected envelope',
        value: '42.6 kW',
      },
      {
        id: 'K-01',
        type: 'RAG',
        resource: 'DMTF DSP2051',
        observation:
          'Thermal, power and performance require shared-timeline correlation',
        value: 'cited',
      },
    ],
    recommendation:
      'Inspect R02 cold-aisle airflow and compare inlet sensors before changing workload placement.',
    metrics: {
      power: [38, 39, 39, 40, 41, 42, 42, 43, 42, 43, 42, 42],
      thermal: [23, 23, 24, 24, 25, 26, 27, 28, 29, 30, 30, 30],
      traffic: [3.1, 3.2, 3.4, 3.6, 3.8, 4.0, 4.1, 4.0, 3.9, 3.8, 3.7, 3.6],
      clock: [
        1830, 1830, 1815, 1810, 1780, 1740, 1690, 1650, 1620, 1615, 1610, 1615,
      ],
    },
  },
  power: {
    label: 'Power-cap event',
    short: 'Power limit → fleet throttling',
    finding: 'Rack power cap constraining R03',
    summary:
      'A Redfish chassis power-cap event aligns with rack-wide clock reduction while inlet temperature remains normal.',
    confidence: 94,
    rack: 'R03',
    severity: 'Warning',
    accent: '#f7d154',
    hypotheses: [
      { title: 'Rack power cap', confidence: 94 },
      { title: 'Facility power instability', confidence: 38 },
      { title: 'Workload shift', confidence: 19 },
    ],
    evidence: [
      {
        id: 'E-01',
        type: 'Redfish',
        resource: 'R03 / Power',
        observation: 'Configured power limit became active',
        value: '35.0 kW cap',
      },
      {
        id: 'G-01',
        type: 'GPU',
        resource: 'R03 / All nodes',
        observation: 'GPU clocks reduced together',
        value: '1,500 MHz',
      },
      {
        id: 'T-01',
        type: 'Thermal',
        resource: 'R03 / Thermal',
        observation: 'Inlet temperature remains normal',
        value: '23.6°C',
      },
      {
        id: 'K-01',
        type: 'RAG',
        resource: 'Redfish Power schema',
        observation: 'Power limit state is direct evidence of active capping',
        value: 'cited',
      },
    ],
    recommendation:
      'Confirm the chassis power limit and facility budget before requesting an approved cap change.',
    metrics: {
      power: [39, 40, 40, 41, 41, 40, 39, 37, 35, 35, 35, 35],
      thermal: [23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24],
      traffic: [3.0, 3.2, 3.5, 3.8, 4.1, 4.0, 3.7, 3.4, 3.0, 2.8, 2.7, 2.7],
      clock: [
        1830, 1840, 1840, 1830, 1810, 1750, 1690, 1600, 1510, 1500, 1500, 1500,
      ],
    },
  },
  pcie: {
    label: 'PCIe degradation',
    short: 'Link width → traffic collapse',
    finding: 'PCIe link degraded on R01-U14',
    summary:
      'Host-to-GPU traffic drops on one node at the same instant Redfish reports a negotiated PCIe width change from x16 to x4.',
    confidence: 96,
    rack: 'R01',
    severity: 'Critical',
    accent: '#ff6f7d',
    hypotheses: [
      { title: 'PCIe link degradation', confidence: 96 },
      { title: 'GPU compute saturation', confidence: 31 },
      { title: 'Top-of-rack congestion', confidence: 18 },
    ],
    evidence: [
      {
        id: 'E-01',
        type: 'Redfish',
        resource: 'R01-U14 / PCIe',
        observation: 'Negotiated width changed from x16 to x4',
        value: 'Critical',
      },
      {
        id: 'N-01',
        type: 'Network',
        resource: 'R01-U14',
        observation: 'Host traffic collapsed while peer nodes stayed stable',
        value: '-69%',
      },
      {
        id: 'G-01',
        type: 'GPU',
        resource: 'R01-U14 / GPU0–7',
        observation: 'Compute utilization is not saturated',
        value: '78%',
      },
      {
        id: 'K-01',
        type: 'RAG',
        resource: 'DMTF data model',
        observation: 'Link health and traffic should be evaluated together',
        value: 'cited',
      },
    ],
    recommendation:
      'Drain R01-U14 from new work and inspect the PCIe link during an approved maintenance window.',
    metrics: {
      power: [39, 39, 40, 40, 40, 40, 39, 39, 39, 39, 39, 39],
      thermal: [23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24],
      traffic: [3.4, 3.5, 3.6, 3.7, 3.8, 3.8, 3.7, 2.9, 1.8, 1.2, 1.1, 1.1],
      clock: [
        1830, 1830, 1830, 1830, 1830, 1820, 1810, 1780, 1760, 1760, 1750, 1750,
      ],
    },
  },
  healthy: {
    label: 'Healthy baseline',
    short: 'Normal operating envelope',
    finding: 'No active hardware anomaly',
    summary:
      'Power, temperature, traffic and GPU clocks remain inside the expected peer and historical operating envelopes.',
    confidence: 97,
    rack: 'R04',
    severity: 'Healthy',
    accent: '#5ef2c4',
    hypotheses: [
      { title: 'No active anomaly', confidence: 97 },
      { title: 'Early thermal drift', confidence: 12 },
      { title: 'Interconnect degradation', confidence: 8 },
    ],
    evidence: [
      {
        id: 'R-01',
        type: 'Redfish',
        resource: 'Fleet',
        observation: 'All chassis health states report OK',
        value: '32 / 32',
      },
      {
        id: 'G-01',
        type: 'GPU',
        resource: 'Fleet',
        observation: 'GPU clocks remain inside learned envelope',
        value: '1,830 MHz',
      },
      {
        id: 'T-01',
        type: 'Thermal',
        resource: 'Fleet',
        observation: 'No inlet exceeds the warning threshold',
        value: '24.1°C max',
      },
      {
        id: 'K-01',
        type: 'RAG',
        resource: 'DMTF telemetry',
        observation: 'No intervention is supported without anomalous evidence',
        value: 'cited',
      },
    ],
    recommendation:
      'Continue monitoring. Current evidence does not support a hardware intervention.',
    metrics: {
      power: [38, 38, 39, 39, 40, 40, 40, 40, 39, 39, 39, 39],
      thermal: [22, 22, 23, 23, 23, 24, 24, 24, 24, 23, 23, 23],
      traffic: [3.0, 3.1, 3.2, 3.4, 3.5, 3.6, 3.5, 3.6, 3.5, 3.4, 3.3, 3.2],
      clock: [
        1810, 1820, 1820, 1830, 1830, 1840, 1830, 1840, 1830, 1830, 1820, 1830,
      ],
    },
  },
};

export const RACKS = [
  { id: 'R01', zone: 'Training', basePower: 39.8, baseTemp: 24.1, load: 82 },
  { id: 'R02', zone: 'Inference', basePower: 42.6, baseTemp: 24.2, load: 91 },
  { id: 'R03', zone: 'Inference', basePower: 37.2, baseTemp: 23.6, load: 76 },
  { id: 'R04', zone: 'Research', basePower: 31.5, baseTemp: 22.9, load: 64 },
];
