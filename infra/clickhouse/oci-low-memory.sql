-- ClickHouse 25.8 on the existing 4 GiB container: the 1,435-column system
-- metric log was repeatedly exhausting tracked memory during horizontal merges.
-- Scope is this diagnostic table only. No deletion, TTL change or raised limit.
ALTER TABLE system.metric_log MODIFY SETTING
    merge_max_block_size = 256,
    merge_max_block_size_bytes = 1048576,
    vertical_merge_algorithm_min_rows_to_activate = 1;

-- Rollback only after reviewing the memory incident (these were inherited):
-- ALTER TABLE system.metric_log RESET SETTING merge_max_block_size,
--   merge_max_block_size_bytes, vertical_merge_algorithm_min_rows_to_activate;
