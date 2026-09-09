'use client';

import {
  Activity,
  Building2,
  ChevronRight,
  Layers3,
  MapPin,
  Network,
  Rows3,
  Server,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { ScenarioKey } from '@/lib/demo-data';

type ViewLevel = 'campus' | 'hall' | 'row';

type Hall = {
  id: string;
  name: string;
  rows: string[];
  power: number;
  inlet: number;
  health: number;
};

type DataCenter = {
  id: string;
  city: string;
  region: string;
  halls: Hall[];
  capacity: string;
  pue: string;
};

const DATA_CENTERS: DataCenter[] = [
  {
    id: 'DEN-01',
    city: 'Denver',
    region: 'US Mountain',
    capacity: '12.8 MW',
    pue: '1.18',
    halls: [
      {
        id: 'A',
        name: 'Hall A',
        rows: ['A-01', 'A-02', 'A-03', 'A-04'],
        power: 4.2,
        inlet: 23.8,
        health: 96,
      },
      {
        id: 'B',
        name: 'Hall B',
        rows: ['B-01', 'B-02', 'B-03', 'B-04'],
        power: 3.9,
        inlet: 22.9,
        health: 99,
      },
      {
        id: 'C',
        name: 'Hall C',
        rows: ['C-01', 'C-02', 'C-03', 'C-04'],
        power: 3.6,
        inlet: 23.1,
        health: 98,
      },
    ],
  },
  {
    id: 'PHX-02',
    city: 'Phoenix',
    region: 'US Southwest',
    capacity: '18.4 MW',
    pue: '1.21',
    halls: [
      {
        id: 'A',
        name: 'Hall A',
        rows: ['A-01', 'A-02', 'A-03', 'A-04'],
        power: 5.8,
        inlet: 24.2,
        health: 97,
      },
      {
        id: 'B',
        name: 'Hall B',
        rows: ['B-01', 'B-02', 'B-03', 'B-04'],
        power: 5.5,
        inlet: 23.7,
        health: 98,
      },
      {
        id: 'C',
        name: 'Hall C',
        rows: ['C-01', 'C-02', 'C-03', 'C-04'],
        power: 4.9,
        inlet: 23.4,
        health: 99,
      },
    ],
  },
  {
    id: 'IAD-03',
    city: 'Ashburn',
    region: 'US East',
    capacity: '22.0 MW',
    pue: '1.16',
    halls: [
      {
        id: 'A',
        name: 'Hall A',
        rows: ['A-01', 'A-02', 'A-03', 'A-04'],
        power: 6.4,
        inlet: 22.6,
        health: 99,
      },
      {
        id: 'B',
        name: 'Hall B',
        rows: ['B-01', 'B-02', 'B-03', 'B-04'],
        power: 6.1,
        inlet: 22.8,
        health: 98,
      },
      {
        id: 'C',
        name: 'Hall C',
        rows: ['C-01', 'C-02', 'C-03', 'C-04'],
        power: 5.7,
        inlet: 22.5,
        health: 99,
      },
    ],
  },
];

const VIEW_OPTIONS: { id: ViewLevel; label: string; icon: typeof Building2 }[] =
  [
    { id: 'campus', label: 'Data center', icon: Building2 },
    { id: 'hall', label: 'Data hall', icon: Layers3 },
    { id: 'row', label: 'Row', icon: Rows3 },
  ];

function Cabinet({
  index,
  active,
  onClick,
}: {
  index: number;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`twin-cabinet ${active ? 'twin-cabinet-alert' : ''}`}
      onClick={onClick}
      aria-label={`Inspect rack R${String(index + 1).padStart(2, '0')}${active ? ', active finding' : ''}`}
    >
      <span className="twin-cabinet-top">
        <Network /> ToR
      </span>
      <span className="twin-server-face" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, unit) => (
          <i key={unit}>
            <b />
            <b />
            <em />
          </i>
        ))}
      </span>
      <strong>R{String(index + 1).padStart(2, '0')}</strong>
    </button>
  );
}

export function DataCenterTwin({
  running,
  scenarioKey,
  onRackSelect,
}: {
  running: boolean;
  scenarioKey: ScenarioKey;
  onRackSelect: (rack: string) => void;
}) {
  const [dataCenterId, setDataCenterId] = useState('DEN-01');
  const [hallId, setHallId] = useState('A');
  const [rowId, setRowId] = useState('A-02');
  const [view, setView] = useState<ViewLevel>('campus');

  const dataCenter =
    DATA_CENTERS.find((item) => item.id === dataCenterId) ?? DATA_CENTERS[0]!;
  const hall =
    dataCenter.halls.find((item) => item.id === hallId) ?? dataCenter.halls[0]!;
  const incidentActive =
    dataCenter.id === 'DEN-01' &&
    hall.id === 'A' &&
    rowId === 'A-02' &&
    scenarioKey !== 'healthy';
  const rowRackCount = 10;
  const totalPower = dataCenter.halls.reduce(
    (sum, item) => sum + item.power,
    0,
  );

  function changeDataCenter(nextId: string) {
    const next =
      DATA_CENTERS.find((item) => item.id === nextId) ?? DATA_CENTERS[0]!;
    setDataCenterId(next.id);
    setHallId(next.halls[0]!.id);
    setRowId(next.halls[0]!.rows[0]!);
  }

  function changeHall(nextId: string) {
    const next =
      dataCenter.halls.find((item) => item.id === nextId) ??
      dataCenter.halls[0]!;
    setHallId(next.id);
    setRowId(next.rows[0]!);
  }

  return (
    <section
      className={`panel twin-panel ${running ? 'twin-running' : 'twin-paused'}`}
      id="digital-twin"
    >
      <div className="twin-heading">
        <div>
          <span className="eyebrow">FACILITY DIGITAL TWIN</span>
          <h2>Navigate the physical hierarchy</h2>
          <p>
            Move from campus health to a single rack while power, cooling and
            incident context stay aligned.
          </p>
        </div>
        <Badge variant="outline">
          <Activity /> INTERACTIVE TOPOLOGY
        </Badge>
      </div>

      <div className="twin-toolbar" aria-label="Facility filters">
        <label>
          <span>
            <Building2 /> Data center
          </span>
          <select
            value={dataCenter.id}
            onChange={(event) => changeDataCenter(event.target.value)}
          >
            {DATA_CENTERS.map((item) => (
              <option value={item.id} key={item.id}>
                {item.id} · {item.city}
              </option>
            ))}
          </select>
        </label>
        <ChevronRight className="twin-toolbar-arrow" />
        <label>
          <span>
            <Layers3 /> Data hall
          </span>
          <select
            value={hall.id}
            onChange={(event) => changeHall(event.target.value)}
          >
            {dataCenter.halls.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <ChevronRight className="twin-toolbar-arrow" />
        <label>
          <span>
            <Rows3 /> Row
          </span>
          <select
            value={rowId}
            onChange={(event) => setRowId(event.target.value)}
          >
            {hall.rows.map((row) => (
              <option value={row} key={row}>
                Row {row}
              </option>
            ))}
          </select>
        </label>
        <div className="twin-view-toggle" aria-label="3D view level">
          {VIEW_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={view === id ? 'active' : ''}
              onClick={() => setView(id)}
              aria-pressed={view === id}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="twin-context-line">
        <div>
          <MapPin />
          <span>
            {dataCenter.city}, {dataCenter.region}
          </span>
          <b>{dataCenter.id}</b>
        </div>
        <span>
          <Zap />{' '}
          {view === 'campus'
            ? `${totalPower.toFixed(1)} MW`
            : view === 'hall'
              ? `${hall.power.toFixed(1)} MW`
              : '426 kW'}
        </span>
        <span>
          <Thermometer />{' '}
          {view === 'row' && incidentActive
            ? '29.8°C peak'
            : `${hall.inlet.toFixed(1)}°C inlet`}
        </span>
        <span>
          <Server />{' '}
          {view === 'campus'
            ? '120 racks'
            : view === 'hall'
              ? '40 racks'
              : `${rowRackCount} racks`}
        </span>
        <span>
          <Activity /> PUE {dataCenter.pue}
        </span>
      </div>

      <div className={`twin-scene twin-scene-${view}`}>
        <div className="twin-scene-label">
          <span>
            {view === 'campus'
              ? `${dataCenter.id} campus`
              : view === 'hall'
                ? `${dataCenter.id} · ${hall.name}`
                : `${dataCenter.id} · ${hall.name} · Row ${rowId}`}
          </span>
          <small>Drag-free guided 3D view · select an object to drill in</small>
        </div>

        {view === 'campus' && (
          <div className="twin-campus-floor">
            <div className="twin-utility-yard">
              <Zap />
              <span>Utility</span>
            </div>
            {dataCenter.halls.map((item, index) => (
              <button
                type="button"
                className={`twin-hall-building hall-position-${index + 1} ${item.id === hall.id ? 'selected' : ''}`}
                key={item.id}
                onClick={() => {
                  setHallId(item.id);
                  setRowId(item.rows[0]!);
                  setView('hall');
                }}
              >
                <span className="twin-hall-roof">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="twin-hall-front">
                  <Building2 />
                  <strong>{item.name}</strong>
                  <small>{item.health}% healthy</small>
                </span>
                <span className="twin-hall-side" />
              </button>
            ))}
            <div className="twin-cooling-yard">
              <Wind />
              <span>Cooling plant</span>
              <i />
              <i />
              <i />
            </div>
            <div className="twin-campus-flow">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}

        {view === 'hall' && (
          <div className="twin-hall-floor">
            <div className="twin-crac-bank">
              <Wind />
              <strong>CRAC</strong>
              <i />
              <i />
              <i />
              <i />
            </div>
            {hall.rows.map((row, rowIndex) => (
              <button
                type="button"
                className={`twin-row-lane twin-row-${rowIndex + 1} ${row === rowId ? 'selected' : ''}`}
                key={row}
                onClick={() => {
                  setRowId(row);
                  setView('row');
                }}
              >
                <span className="twin-row-racks">
                  {Array.from({ length: 8 }).map((_, rack) => (
                    <i key={rack}>
                      <b />
                      <b />
                    </i>
                  ))}
                </span>
                <strong>ROW {row}</strong>
                <small>
                  {row === 'A-02' &&
                  dataCenter.id === 'DEN-01' &&
                  scenarioKey !== 'healthy'
                    ? '1 finding'
                    : 'Healthy'}
                </small>
              </button>
            ))}
            <div className="twin-hall-air">
              <span>COLD AISLE</span>
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        )}

        {view === 'row' && (
          <div className="twin-row-floor">
            <div className="twin-air-stream twin-air-cold">
              <Wind />
              <span>18°C supply</span>
              <i />
              <i />
              <i />
            </div>
            <div className="twin-cabinet-line">
              {Array.from({ length: rowRackCount }).map((_, index) => {
                const active = incidentActive && index === 1;
                return (
                  <Cabinet
                    key={index}
                    index={index}
                    active={active}
                    onClick={() => onRackSelect(`R0${(index % 4) + 1}`)}
                  />
                );
              })}
            </div>
            <div className="twin-overhead-bus">
              <Zap />
              <span>Overhead busway · A/B feeds</span>
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="twin-air-stream twin-air-hot">
              <i />
              <i />
              <i />
              <span>
                {incidentActive ? '41.4°C peak exhaust' : '35°C exhaust'}
              </span>
              <Wind />
            </div>
            <div className="twin-floor-grid" aria-hidden="true" />
          </div>
        )}

        <div className="twin-camera-legend">
          <span>
            <i className="twin-ok" /> Healthy
          </span>
          <span>
            <i className="twin-alert" /> Active finding
          </span>
          <span>
            <i className="twin-cold" /> Supply air
          </span>
          <span>
            <i className="twin-hot" /> Exhaust air
          </span>
        </div>
      </div>
    </section>
  );
}
