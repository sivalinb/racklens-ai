CREATE TABLE `evaluation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp_ms` integer NOT NULL,
	`provider` text NOT NULL,
	`region` text NOT NULL,
	`commit_sha` text NOT NULL,
	`suite` text NOT NULL,
	`cases_total` integer NOT NULL,
	`cases_passed` integer NOT NULL,
	`pass_rate` real NOT NULL,
	`top_cause_accuracy` real NOT NULL,
	`citation_validity` real NOT NULL,
	`unsafe_action_rate` real NOT NULL,
	`p95_latency_ms` integer NOT NULL,
	`artifact_uri` text,
	`mode` text DEFAULT 'deterministic-baseline' NOT NULL,
	`attributes_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_evaluation_provider_time` ON `evaluation_runs` (`provider`,`timestamp_ms`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_suite_time` ON `evaluation_runs` (`suite`,`timestamp_ms`);