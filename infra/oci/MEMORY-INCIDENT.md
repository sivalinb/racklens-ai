# Small-host ClickHouse memory incident — 2026-09-08

## Diagnosis

The 4 GiB ClickHouse 25.8.33.6 container kept its normal 3.60 GiB tracked-memory ceiling. A collector insert at 21:29:51 UTC was selected for termination when the server hit that limit; the insert itself used only 8,857,608 tracked bytes. The unhandled exception restarted the edge collector. This was a query-memory rejection, not a Docker OOM kill.

Read-only investigation found repeated `system.metric_log` background merge failures, with one live merge using 2,457,365,571 tracked bytes. The log has **1,435 columns**; its default 8,192-row merge blocks and 131,072-row vertical-merge threshold were unsuitable for this small host. Background failures were occurring roughly once per second. Their allocations also generated tens of thousands of memory-profile records per minute. Application telemetry tables were much smaller than the internal trace log.

This evidence identifies an immediate contention source, not an exhaustive capacity model. Container memory includes file pages; process RSS, allocator tracking and cgroup usage are different measurements. Never raise the host/container limit or disable memory enforcement to hide this failure.

## Targeted database change

Apply [oci-low-memory.sql](../clickhouse/oci-low-memory.sql) through an authenticated private operator connection after checking the exact ClickHouse version, table and current settings. It changes **only** `system.metric_log`:

- merge block rows: 8,192 → 256;
- merge block byte target: 10 MiB → 1 MiB;
- vertical merge row threshold: 131,072 → 1 (the existing column/algorithm eligibility checks still apply).

No rows are deleted, no TTL is shortened, and no collection is disabled. The `ALTER TABLE` settings persist in table metadata without restarting the database. Verify them after database upgrades: a schema-changing internal-log rotation can create a new table that needs the same review. These controls reduce merge working-set size, not a strict total-memory guarantee; smaller blocks can affect merge throughput.

The approved change was applied at approximately 22:21:34 UTC. By 22:25:41, the memory-error counter remained at **66,204**, its last event still 22:21:33, and recent memory-profile records fell from approximately 85,000/minute to 374/minute. This initial observation is finite, not an availability promise. Preserve the historical logs; do not truncate them just to improve a chart.

Rollback, if required after review, resets only those three explicitly added table settings using the commented command in the SQL file. Do not drop/recreate the table or reset other configuration.

## Collector failure handling

The collector now distinguishes temporary ClickHouse memory/overload/transport failures from authentication, schema or programming errors. Temporary failures produce a bounded, sanitized event and back off between **fresh** collection cycles: 30, 60, 120, 240, then 300 seconds at the standard interval. Recovery resets the delay. A configured normal interval longer than 300s is preserved.

It intentionally does **not** replay a failed batch: an insert, materialized view or composite destination can have partially succeeded. Blind retry would risk duplicate data without an end-to-end deduplication contract. The event marks delivery `unknown_not_replayed`; there may be a gap. There is no durable queue or exactly-once claim. Authentication/schema/programming errors still fail visibly instead of looping indefinitely. The same store-failure boundary is used by the Redfish and simulator loops; this does not make simulator sensor readings real hardware measurements.

Seven new regression tests cover bounded error reads/redaction, no transport replay, fatal nontransient errors, capped/reset backoff, recovery events, fresh simulator steps and the Redfish loop. **28 Python tests** pass locally with telemetry export disabled for the test process. No production failure injection is needed.

## Safe deployment on the existing host

The deployed checkout contains earlier local repairs. **Do not pull/reset over those changes or rebuild the whole stack.** Compare the two collector source hashes to the reviewed preimage, preserve copies, and apply only the `collector.py`/`telemetry.py` patch. A minimal image layered on the recorded running collector image can copy those two files into the installed package, preserving its exact existing runtime dependencies. Record the resulting image ID. Recreate **only** `edge-collector` with `--no-deps --no-build` using the existing environment file and Compose files.

This deliberately restarts the collector once; do not confuse its replacement container's zero restart counter with disappearance of the old incident. Keep the old image and preimage files for rollback. API, database, Grafana, OTel collector, secrets, networks, memory limits and data volumes remain unchanged. Never use a broad stack restart, prune, `down -v` or a database restore as a shortcut.

Validate continuing collector timestamps, both destination paths as configured, no new process restarts, no new memory-error counter increments, host RAM/disk/swap floors and API response health. A temporary collection gap during recreation is possible. Continue checking after normal traffic resumes; short observations do not prove all future workloads fit.

References: [ClickHouse merge-block settings](https://clickhouse.com/docs/reference/settings/merge-tree-settings/merge-max), [vertical-merge eligibility](https://clickhouse.com/docs/reference/settings/merge-tree-settings/vertical-merge), [memory overcommit behavior](https://clickhouse.com/docs/concepts/features/configuration/settings/memory-overcommit).
