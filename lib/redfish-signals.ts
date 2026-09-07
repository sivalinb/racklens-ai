import type { Scenario, ScenarioKey } from '@/lib/demo-data';

export type SignalScope = 'rack' | 'gpu';
export type SignalGroup = 'All' | 'Power' | 'Thermal' | 'Health' | 'Fabric';

export type RedfishSignal = {
  id: string;
  label: string;
  group: Exclude<SignalGroup, 'All'>;
  value: string;
  delta: string;
  status: 'ok' | 'warning' | 'critical' | 'info';
  color: string;
  source: string;
  uri: string;
  series: number[];
};

const vary = (values: number[], offset: number, scale = 1) =>
  values.map((value, index) =>
    Number((value * scale + offset + ((index % 3) - 1) * 0.12).toFixed(2)),
  );

const constant = (value: number, spread = 0.2) =>
  Array.from({ length: 12 }, (_, index) =>
    Number((value + Math.sin(index * 0.8) * spread).toFixed(2)),
  );

export function buildRedfishSignals(
  scope: SignalScope,
  rackId: string,
  gpuIndex: number,
  scenarioKey: ScenarioKey,
  scenario: Scenario,
): RedfishSignal[] {
  const rackOffset = Number(rackId.slice(1)) - 2;
  const isAffected = rackId === scenario.rack && scenarioKey !== 'healthy';
  const warning = isAffected ? 'warning' : 'ok';

  if (scope === 'rack') {
    const inlet = vary(scenario.metrics.thermal, rackOffset * 0.25);
    const power = vary(scenario.metrics.power, rackOffset * 0.65);
    const traffic = vary(scenario.metrics.traffic, rackOffset * 0.08);
    return [
      {
        id: 'rack-power',
        label: 'Rack power draw',
        group: 'Power',
        value: `${power.at(-1)?.toFixed(1)} kW`,
        delta:
          scenarioKey === 'power' && isAffected ? 'cap active' : '+1.8% vs 15m',
        status: scenarioKey === 'power' && isAffected ? 'critical' : 'ok',
        color: '#f2ca61',
        source: 'Chassis Power',
        uri: `/redfish/v1/Chassis/${rackId}/Power`,
        series: power,
      },
      {
        id: 'power-cap',
        label: 'Configured power cap',
        group: 'Power',
        value: `${scenarioKey === 'power' && isAffected ? '35.0' : '48.0'} kW`,
        delta:
          scenarioKey === 'power' && isAffected
            ? 'limit reached'
            : '27% headroom',
        status: scenarioKey === 'power' && isAffected ? 'critical' : 'info',
        color: '#d5a4ff',
        source: 'PowerControl',
        uri: `/redfish/v1/Chassis/${rackId}/Power#/PowerControl/0`,
        series: constant(scenarioKey === 'power' && isAffected ? 35 : 48, 0),
      },
      {
        id: 'input-voltage',
        label: 'Input voltage',
        group: 'Power',
        value: `${(240 + rackOffset * 0.6).toFixed(1)} V`,
        delta: 'stable',
        status: 'ok',
        color: '#71d9f1',
        source: 'PowerSupply',
        uri: `/redfish/v1/Chassis/${rackId}/Power#/PowerSupplies/0`,
        series: constant(240 + rackOffset * 0.6, 0.45),
      },
      {
        id: 'input-current',
        label: 'Input current',
        group: 'Power',
        value: `${((power.at(-1) ?? 40) / 0.24).toFixed(0)} A`,
        delta: '+3.1 A',
        status: warning,
        color: '#efac5f',
        source: 'PowerSupply',
        uri: `/redfish/v1/Chassis/${rackId}/Power#/PowerSupplies`,
        series: power.map((value) => Number((value / 0.24).toFixed(1))),
      },
      {
        id: 'inlet-temperature',
        label: 'Cold-aisle inlet',
        group: 'Thermal',
        value: `${inlet.at(-1)?.toFixed(1)} °C`,
        delta:
          scenarioKey === 'cooling' && isAffected
            ? '+5.6 °C above peers'
            : 'inside envelope',
        status: scenarioKey === 'cooling' && isAffected ? 'critical' : 'ok',
        color: '#52d7ef',
        source: 'Thermal Temperature',
        uri: `/redfish/v1/Chassis/${rackId}/Thermal#/Temperatures/0`,
        series: inlet,
      },
      {
        id: 'exhaust-temperature',
        label: 'Hot-aisle exhaust',
        group: 'Thermal',
        value: `${((inlet.at(-1) ?? 24) + 11.6).toFixed(1)} °C`,
        delta: `${scenarioKey === 'cooling' && isAffected ? '+' : ''}11.6 °C ΔT`,
        status: scenarioKey === 'cooling' && isAffected ? 'warning' : 'ok',
        color: '#f48762',
        source: 'Thermal Temperature',
        uri: `/redfish/v1/Chassis/${rackId}/Thermal#/Temperatures/1`,
        series: inlet.map((value) => Number((value + 11.6).toFixed(1))),
      },
      {
        id: 'fan-duty',
        label: 'Cooling fan duty',
        group: 'Thermal',
        value: `${scenarioKey === 'cooling' && isAffected ? '96' : '72'}%`,
        delta:
          scenarioKey === 'cooling' && isAffected ? '+22% in 5m' : 'balanced',
        status: scenarioKey === 'cooling' && isAffected ? 'warning' : 'ok',
        color: '#70e0bd',
        source: 'Thermal Fan',
        uri: `/redfish/v1/Chassis/${rackId}/Thermal#/Fans`,
        series:
          scenarioKey === 'cooling' && isAffected
            ? [69, 70, 72, 75, 78, 82, 86, 89, 92, 94, 95, 96]
            : constant(72, 2),
      },
      {
        id: 'fan-rpm',
        label: 'Fan-zone speed',
        group: 'Thermal',
        value: `${scenarioKey === 'cooling' && isAffected ? '15,820' : '12,460'} RPM`,
        delta: '6 fans reporting',
        status: warning,
        color: '#75b9ff',
        source: 'Thermal Fan',
        uri: `/redfish/v1/Chassis/${rackId}/Thermal#/Fans/0`,
        series:
          scenarioKey === 'cooling' && isAffected
            ? vary(
                [
                  11.9, 12.1, 12.4, 12.8, 13.3, 13.9, 14.4, 14.9, 15.3, 15.6,
                  15.7, 15.82,
                ],
                0,
              )
            : constant(12.46, 0.22),
      },
      {
        id: 'health',
        label: 'Aggregate health',
        group: 'Health',
        value: isAffected ? 'Warning' : 'OK',
        delta: isAffected ? '1 subsystem affected' : 'all subsystems nominal',
        status: warning,
        color: isAffected ? '#f3ae62' : '#5ee2b7',
        source: 'Chassis Status',
        uri: `/redfish/v1/Chassis/${rackId}#/Status`,
        series: isAffected
          ? [1, 1, 1, 1, 1, 1, 0.9, 0.8, 0.75, 0.7, 0.7, 0.7]
          : constant(1, 0),
      },
      {
        id: 'active-events',
        label: 'Active Redfish events',
        group: 'Health',
        value: isAffected ? '2' : '0',
        delta: isAffected ? '1 new in 5m' : 'quiet window',
        status: warning,
        color: '#d49aff',
        source: 'EventService',
        uri: '/redfish/v1/EventService',
        series: isAffected
          ? [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2]
          : constant(0, 0),
      },
      {
        id: 'sel-count',
        label: 'System event log',
        group: 'Health',
        value: isAffected ? '3 entries' : '0 entries',
        delta: 'current incident window',
        status: warning,
        color: '#9eaeea',
        source: 'LogService',
        uri: `/redfish/v1/Systems/${rackId}/LogServices/SEL`,
        series: isAffected
          ? [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3]
          : constant(0, 0),
      },
      {
        id: 'tor-ingress',
        label: 'ToR ingress traffic',
        group: 'Fabric',
        value: `${traffic.at(-1)?.toFixed(2)} Tb/s`,
        delta: scenarioKey === 'pcie' && isAffected ? '-68.5%' : '+4.2%',
        status: scenarioKey === 'pcie' && isAffected ? 'critical' : 'ok',
        color: '#66dcf0',
        source: 'NetworkAdapter',
        uri: `/redfish/v1/Chassis/${rackId}/NetworkAdapters/ToR-A`,
        series: traffic,
      },
      {
        id: 'tor-egress',
        label: 'ToR egress traffic',
        group: 'Fabric',
        value: `${((traffic.at(-1) ?? 3) * 0.91).toFixed(2)} Tb/s`,
        delta: '91% symmetry',
        status: warning,
        color: '#9a83ee',
        source: 'NetworkDeviceFunction',
        uri: `/redfish/v1/Chassis/${rackId}/NetworkAdapters/ToR-B`,
        series: traffic.map((value) => Number((value * 0.91).toFixed(2))),
      },
      {
        id: 'link-errors',
        label: 'Fabric error rate',
        group: 'Fabric',
        value: scenarioKey === 'pcie' && isAffected ? '42 /min' : '0.2 /min',
        delta:
          scenarioKey === 'pcie' && isAffected
            ? '+41.8 /min'
            : 'below threshold',
        status: scenarioKey === 'pcie' && isAffected ? 'critical' : 'ok',
        color: '#ef6f82',
        source: 'Port Metrics',
        uri: `/redfish/v1/Chassis/${rackId}/NetworkAdapters/ToR-A/Ports/1/Metrics`,
        series:
          scenarioKey === 'pcie' && isAffected
            ? [0, 0, 1, 1, 2, 4, 8, 14, 23, 31, 38, 42]
            : constant(0.2, 0.08),
      },
    ];
  }

  const gpuOffset = gpuIndex * 0.7;
  const gpuAffected =
    isAffected &&
    (scenarioKey === 'pcie' ? gpuIndex === 3 : [2, 3, 6, 7].includes(gpuIndex));
  const gpuStatus = gpuAffected ? 'warning' : 'ok';
  const clock = vary(scenario.metrics.clock, gpuOffset, 1);
  const temperature = scenario.metrics.thermal.map((value) =>
    Number((value + 35 + gpuIndex * 0.45).toFixed(1)),
  );
  const traffic = vary(scenario.metrics.traffic, gpuIndex * 0.03, 0.12);
  return [
    {
      id: 'gpu-health',
      label: 'GPU health',
      group: 'Health',
      value: gpuAffected ? 'Warning' : 'OK',
      delta: gpuAffected ? 'degraded path' : 'nominal',
      status: gpuStatus,
      color: gpuAffected ? '#f3ae62' : '#5ee2b7',
      source: 'PCIeDevice Status',
      uri: `/redfish/v1/Systems/${rackId}-U18/PCIeDevices/GPU${gpuIndex}#/Status`,
      series: gpuAffected
        ? [1, 1, 1, 1, 0.9, 0.8, 0.75, 0.7, 0.7, 0.7, 0.7, 0.7]
        : constant(1, 0),
    },
    {
      id: 'gpu-power',
      label: 'Board power',
      group: 'Power',
      value: `${scenarioKey === 'power' && isAffected ? 438 : 524} W`,
      delta: scenarioKey === 'power' && isAffected ? '-16.4%' : '+8 W',
      status: scenarioKey === 'power' && isAffected ? 'warning' : 'ok',
      color: '#f2ca61',
      source: 'OEM MetricReport',
      uri: `/redfish/v1/TelemetryService/MetricReports/${rackId}-GPU${gpuIndex}`,
      series: vary(scenario.metrics.power, 90 + gpuOffset, 10.2),
    },
    {
      id: 'gpu-power-limit',
      label: 'Power limit',
      group: 'Power',
      value: '700 W',
      delta:
        scenarioKey === 'power' && isAffected
          ? '62.6% utilized'
          : '74.9% utilized',
      status: 'info',
      color: '#d5a4ff',
      source: 'OEM MetricDefinition',
      uri: '/redfish/v1/TelemetryService/MetricDefinitions/GpuPowerLimit',
      series: constant(700, 0),
    },
    {
      id: 'gpu-temperature',
      label: 'GPU temperature',
      group: 'Thermal',
      value: `${gpuAffected && scenarioKey === 'cooling' ? 78 : Math.round(temperature.at(-1) ?? 61)} °C`,
      delta:
        gpuAffected && scenarioKey === 'cooling'
          ? '+14 °C in 5m'
          : 'inside envelope',
      status: gpuAffected && scenarioKey === 'cooling' ? 'critical' : 'ok',
      color: '#f48762',
      source: 'OEM MetricReport',
      uri: `/redfish/v1/TelemetryService/MetricReports/${rackId}-GPU${gpuIndex}`,
      series:
        gpuAffected && scenarioKey === 'cooling'
          ? temperature.map((value, index) => value + index * 1.4)
          : temperature,
    },
    {
      id: 'gpu-memory-temp',
      label: 'HBM temperature',
      group: 'Thermal',
      value: `${gpuAffected && scenarioKey === 'cooling' ? 84 : 68} °C`,
      delta: gpuAffected ? '+9 °C' : '+1 °C',
      status: gpuAffected && scenarioKey === 'cooling' ? 'warning' : 'ok',
      color: '#ef9b73',
      source: 'OEM MetricReport',
      uri: `/redfish/v1/TelemetryService/MetricReports/${rackId}-GPU${gpuIndex}`,
      series: temperature.map((value) => Number((value + 7).toFixed(1))),
    },
    {
      id: 'gpu-fan-zone',
      label: 'Host fan zone',
      group: 'Thermal',
      value: `${gpuAffected && scenarioKey === 'cooling' ? 96 : 73}%`,
      delta: 'mapped through Chassis',
      status: gpuStatus,
      color: '#70e0bd',
      source: 'Chassis Thermal',
      uri: `/redfish/v1/Chassis/${rackId}/Thermal#/Fans/${Math.floor(gpuIndex / 2)}`,
      series:
        gpuAffected && scenarioKey === 'cooling'
          ? [70, 72, 74, 77, 81, 85, 88, 91, 93, 94, 95, 96]
          : constant(73, 2),
    },
    {
      id: 'sm-clock',
      label: 'Accelerator clock',
      group: 'Health',
      value: `${Math.round(clock.at(-1) ?? 1830)} MHz`,
      delta: gpuAffected ? '-11.2%' : 'within baseline',
      status: gpuStatus,
      color: '#71d9f1',
      source: 'OEM MetricReport',
      uri: `/redfish/v1/TelemetryService/MetricReports/${rackId}-GPU${gpuIndex}`,
      series: clock,
    },
    {
      id: 'gpu-utilization',
      label: 'GPU utilization',
      group: 'Health',
      value: `${74 + ((gpuIndex * 3) % 21)}%`,
      delta: '+3.4%',
      status: 'ok',
      color: '#7fe0b9',
      source: 'OEM MetricReport',
      uri: `/redfish/v1/TelemetryService/MetricReports/${rackId}-GPU${gpuIndex}`,
      series: constant(74 + ((gpuIndex * 3) % 21), 5.2),
    },
    {
      id: 'pcie-width',
      label: 'PCIe negotiated width',
      group: 'Fabric',
      value: scenarioKey === 'pcie' && gpuAffected ? 'x4' : 'x16',
      delta:
        scenarioKey === 'pcie' && gpuAffected ? 'down from x16' : 'full width',
      status: scenarioKey === 'pcie' && gpuAffected ? 'critical' : 'ok',
      color: '#d39bff',
      source: 'PCIeInterface',
      uri: `/redfish/v1/Systems/${rackId}-U18/PCIeDevices/GPU${gpuIndex}#/PCIeInterface`,
      series:
        scenarioKey === 'pcie' && gpuAffected
          ? [16, 16, 16, 16, 16, 16, 16, 8, 4, 4, 4, 4]
          : constant(16, 0),
    },
    {
      id: 'pcie-speed',
      label: 'PCIe link speed',
      group: 'Fabric',
      value: scenarioKey === 'pcie' && gpuAffected ? '8.0 GT/s' : '32.0 GT/s',
      delta: scenarioKey === 'pcie' && gpuAffected ? '-75%' : 'Gen5',
      status: scenarioKey === 'pcie' && gpuAffected ? 'critical' : 'ok',
      color: '#aa8bf1',
      source: 'PCIeInterface',
      uri: `/redfish/v1/Systems/${rackId}-U18/PCIeDevices/GPU${gpuIndex}#/PCIeInterface`,
      series:
        scenarioKey === 'pcie' && gpuAffected
          ? [32, 32, 32, 32, 32, 32, 32, 16, 8, 8, 8, 8]
          : constant(32, 0),
    },
    {
      id: 'pcie-rx',
      label: 'Host-to-GPU traffic',
      group: 'Fabric',
      value: `${(traffic.at(-1) ?? 0.4).toFixed(2)} TB/s`,
      delta: scenarioKey === 'pcie' && gpuAffected ? '-69%' : '+2.8%',
      status: scenarioKey === 'pcie' && gpuAffected ? 'critical' : 'ok',
      color: '#59d9ef',
      source: 'OEM MetricReport',
      uri: `/redfish/v1/TelemetryService/MetricReports/${rackId}-GPU${gpuIndex}`,
      series:
        scenarioKey === 'pcie' && gpuAffected
          ? traffic.map((value, index) => (index > 6 ? value * 0.32 : value))
          : traffic,
    },
    {
      id: 'nvlink-throughput',
      label: 'GPU fabric throughput',
      group: 'Fabric',
      value: `${scenarioKey === 'pcie' && gpuAffected ? 118 : 392} GB/s`,
      delta: gpuAffected ? '-69.9%' : '97% of baseline',
      status: gpuStatus,
      color: '#6f97ff',
      source: 'OEM MetricReport',
      uri: `/redfish/v1/TelemetryService/MetricReports/${rackId}-GPU${gpuIndex}`,
      series:
        scenarioKey === 'pcie' && gpuAffected
          ? [392, 390, 394, 388, 386, 380, 310, 220, 154, 121, 118, 118]
          : constant(392, 8),
    },
    {
      id: 'correctable-errors',
      label: 'Correctable errors',
      group: 'Health',
      value: scenarioKey === 'pcie' && gpuAffected ? '42 /min' : '0 /min',
      delta: scenarioKey === 'pcie' && gpuAffected ? '+42 /min' : 'no change',
      status: scenarioKey === 'pcie' && gpuAffected ? 'critical' : 'ok',
      color: '#ef6f82',
      source: 'PCIeDevice Metrics',
      uri: `/redfish/v1/Systems/${rackId}-U18/PCIeDevices/GPU${gpuIndex}/Metrics`,
      series:
        scenarioKey === 'pcie' && gpuAffected
          ? [0, 0, 0, 1, 1, 3, 7, 12, 21, 29, 37, 42]
          : constant(0, 0),
    },
    {
      id: 'uncorrectable-errors',
      label: 'Uncorrectable errors',
      group: 'Health',
      value: '0',
      delta: 'no change',
      status: 'ok',
      color: '#6fdcb8',
      source: 'PCIeDevice Metrics',
      uri: `/redfish/v1/Systems/${rackId}-U18/PCIeDevices/GPU${gpuIndex}/Metrics`,
      series: constant(0, 0),
    },
  ];
}

export function buildSignalEvents(
  scope: SignalScope,
  rackId: string,
  gpuIndex: number,
  scenarioKey: ScenarioKey,
) {
  const target = scope === 'rack' ? rackId : `${rackId}-U18 / GPU ${gpuIndex}`;
  const scenarioEvent = {
    cooling: [
      'ThermalThresholdCrossed',
      'Inlet temperature crossed the warning envelope',
    ],
    power: [
      'PowerLimitActivated',
      'Configured chassis power cap became active',
    ],
    pcie: ['PCIeLinkDegraded', 'Negotiated link width changed below expected'],
    healthy: [
      'ResourceStatusOK',
      'All monitored resources remain in the normal envelope',
    ],
  }[scenarioKey];
  return [
    {
      time: '14:32:08.412',
      severity: scenarioKey === 'healthy' ? 'OK' : 'Warning',
      event: scenarioEvent[0],
      target,
      message: scenarioEvent[1],
    },
    {
      time: '14:31:44.092',
      severity: 'OK',
      event: 'MetricReportUpdated',
      target,
      message: 'Telemetry report sampled and normalized',
    },
    {
      time: '14:31:10.774',
      severity: 'Info',
      event: 'ResourceUpdated',
      target,
      message: 'Inventory and status snapshot refreshed',
    },
    {
      time: '14:30:42.018',
      severity: 'OK',
      event: 'Heartbeat',
      target,
      message: 'Redfish event subscription remains healthy',
    },
  ];
}
