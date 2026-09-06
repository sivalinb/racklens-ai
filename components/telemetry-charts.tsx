import type { Scenario } from '@/lib/demo-data';

function points(values: number[], width = 300, height = 90) {
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  return values.map((value, index) => `${(index/(values.length-1))*width},${height-8-((value-min)/range)*(height-20)}`).join(' ');
}

function Chart({ title, unit, values, color, value }: { title: string; unit: string; values: number[]; color: string; value: string }) {
  const path = points(values);
  return <div className="mini-chart">
    <div className="chart-heading"><div><span>{title}</span><strong>{value}</strong></div><small>{unit}</small></div>
    <svg viewBox="0 0 300 90" preserveAspectRatio="none" aria-label={`${title} time series`}>
      <defs><linearGradient id={`fill-${title.replaceAll(' ','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {[18,40,62,84].map(y=><line key={y} x1="0" x2="300" y1={y} y2={y} className="chart-grid-line"/>)}
      <polygon points={`0,90 ${path} 300,90`} fill={`url(#fill-${title.replaceAll(' ','')})`}/>
      <polyline points={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" className="chart-line"/>
      <circle cx="300" cy={path.split(' ').at(-1)?.split(',')[1]} r="3" fill={color} className="chart-pulse"/>
    </svg>
  </div>;
}

export function TelemetryCharts({ scenario }: { scenario: Scenario }) {
  return <article className="panel telemetry-panel" id="telemetry">
    <div className="panel-heading"><div><span className="eyebrow">SHARED INCIDENT WINDOW · 2 MINUTES</span><h2>Power, thermal, traffic and clocks</h2></div><span className="sample-rate">5s samples</span></div>
    <div className="chart-grid">
      <Chart title="Rack power" unit="kW" values={scenario.metrics.power} color="#57dfbd" value={`${scenario.metrics.power.at(-1)} kW`}/>
      <Chart title="Inlet thermal" unit="°C" values={scenario.metrics.thermal} color="#ffab5b" value={`${scenario.metrics.thermal.at(-1)}°C`}/>
      <Chart title="Fabric traffic" unit="Tb/s" values={scenario.metrics.traffic} color="#8c9fff" value={`${scenario.metrics.traffic.at(-1)} Tb/s`}/>
      <Chart title="GPU clock" unit="MHz" values={scenario.metrics.clock} color="#ff7287" value={`${scenario.metrics.clock.at(-1)} MHz`}/>
    </div>
  </article>;
}
