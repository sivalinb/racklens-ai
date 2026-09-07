DROP INDEX `idx_metric_target_time`;--> statement-breakpoint
CREATE INDEX `idx_metric_target_time` ON `metric_samples` (`data_center`,`hall`,`row_name`,`rack_id`,`node_id`,`gpu_id`,`timestamp_ms`);