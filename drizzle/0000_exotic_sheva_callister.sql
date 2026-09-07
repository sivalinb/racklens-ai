CREATE TABLE `ai_traces` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp_ms` integer NOT NULL,
	`project` text NOT NULL,
	`environment` text NOT NULL,
	`data_center` text NOT NULL,
	`rack_id` text NOT NULL,
	`incident_id` text NOT NULL,
	`status` text NOT NULL,
	`latency_ms` integer NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`estimated_cost_usd` real NOT NULL,
	`groundedness` real NOT NULL,
	`citation_validity` real NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`redfish_event_id` text NOT NULL,
	`export_mode` text DEFAULT 'otel-hybrid' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_trace_project_time` ON `ai_traces` (`project`,`timestamp_ms`);--> statement-breakpoint
CREATE INDEX `idx_trace_incident` ON `ai_traces` (`incident_id`);--> statement-breakpoint
CREATE TABLE `metric_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp_ms` integer NOT NULL,
	`tenant_id` text DEFAULT 'public-demo' NOT NULL,
	`data_center` text NOT NULL,
	`hall` text NOT NULL,
	`row_name` text NOT NULL,
	`rack_id` text NOT NULL,
	`node_id` text DEFAULT 'all' NOT NULL,
	`gpu_id` text DEFAULT 'all' NOT NULL,
	`metric_name` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`severity` text DEFAULT 'ok' NOT NULL,
	`source_kind` text NOT NULL,
	`source_uri` text NOT NULL,
	`incident_id` text,
	`trace_id` text,
	`attributes_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_metric_target_time` ON `metric_samples` (`data_center`,`hall`,`row_name`,`rack_id`,`node_id`,`gpu_id`,`timestamp_ms`);--> statement-breakpoint
CREATE INDEX `idx_metric_incident` ON `metric_samples` (`incident_id`);--> statement-breakpoint
CREATE TABLE `telemetry_events` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp_ms` integer NOT NULL,
	`data_center` text NOT NULL,
	`hall` text NOT NULL,
	`row_name` text NOT NULL,
	`rack_id` text NOT NULL,
	`node_id` text,
	`gpu_id` text,
	`severity` text NOT NULL,
	`event_type` text NOT NULL,
	`message` text NOT NULL,
	`source_uri` text NOT NULL,
	`incident_id` text,
	`trace_id` text
);
--> statement-breakpoint
CREATE INDEX `idx_event_target_time` ON `telemetry_events` (`data_center`,`rack_id`,`timestamp_ms`);--> statement-breakpoint
CREATE INDEX `idx_event_trace` ON `telemetry_events` (`trace_id`);