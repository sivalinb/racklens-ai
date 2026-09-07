CREATE DATABASE IF NOT EXISTS racklens;

CREATE TABLE IF NOT EXISTS racklens.metric_samples
(
  timestamp DateTime64(3, 'UTC'),
  tenant_id LowCardinality(String),
  data_center LowCardinality(String),
  hall LowCardinality(String),
  row_name LowCardinality(String),
  rack_id LowCardinality(String),
  node_id LowCardinality(String),
  gpu_id LowCardinality(String),
  metric_name LowCardinality(String),
  value Float64,
  unit LowCardinality(String),
  severity LowCardinality(String),
  source_kind LowCardinality(String),
  source_uri String,
  incident_id String,
  trace_id String,
  attributes_json String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, data_center, hall, row_name, rack_id, node_id, gpu_id, metric_name, timestamp)
TTL timestamp + INTERVAL 30 DAY DELETE;

CREATE TABLE IF NOT EXISTS racklens.metric_samples_1m
(
  bucket DateTime('UTC'),
  tenant_id LowCardinality(String),
  data_center LowCardinality(String),
  hall LowCardinality(String),
  row_name LowCardinality(String),
  rack_id LowCardinality(String),
  node_id LowCardinality(String),
  gpu_id LowCardinality(String),
  metric_name LowCardinality(String),
  value_avg Float64,
  value_min Float64,
  value_max Float64,
  samples UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(bucket)
ORDER BY (tenant_id, data_center, hall, row_name, rack_id, node_id, gpu_id, metric_name, bucket);

CREATE MATERIALIZED VIEW IF NOT EXISTS racklens.metric_samples_1m_mv
TO racklens.metric_samples_1m AS
SELECT
  toStartOfMinute(timestamp) AS bucket,
  tenant_id, data_center, hall, row_name, rack_id, node_id, gpu_id, metric_name,
  avg(value) AS value_avg,
  min(value) AS value_min,
  max(value) AS value_max,
  count() AS samples
FROM racklens.metric_samples
GROUP BY bucket, tenant_id, data_center, hall, row_name, rack_id, node_id, gpu_id, metric_name;
