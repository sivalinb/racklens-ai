#!/bin/sh
set -eu

if [ "${COLLECTOR_MODE:-simulator}" = "redfish" ]; then
  exec racklens collect-redfish \
    --interval "${COLLECTOR_INTERVAL_SECONDS:-30}" \
    --data-center "${RACKLENS_DATA_CENTER:-OCI-PHX-01}"
fi

exec racklens simulate-telemetry \
  --interval "${COLLECTOR_INTERVAL_SECONDS:-30}" \
  --scenario "${RACKLENS_SCENARIO:-cooling_imbalance}" \
  --data-center "${RACKLENS_DATA_CENTER:-OCI-PHX-01}" \
  --hall "${RACKLENS_DATA_HALL:-Hall A}" \
  --row "${RACKLENS_ROW:-Row 02}"
