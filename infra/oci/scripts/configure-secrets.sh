#!/bin/bash
set -euo pipefail

ENV_FILE=/etc/racklens/racklens.env
if [[ ! -t 0 ]]; then
  echo "Run this script from an interactive Bastion SSH session." >&2
  exit 1
fi

read -r -p "OCI region (for example us-phoenix-1): " OCI_REGION_INPUT
read -r -p "RackLens Object Storage bucket name: " OCI_BUCKET_INPUT
read -r -p "RackLens compartment OCID: " OCI_COMPARTMENT_INPUT
read -r -p "Public site URL [https://racklens-ai.siva-babu.chatgpt.site]: " HOSTED_URL_INPUT
HOSTED_URL_INPUT=${HOSTED_URL_INPUT:-https://racklens-ai.siva-babu.chatgpt.site}
read -r -s -p "Hosted ingest token: " INGEST_TOKEN_INPUT
echo
read -r -s -p "New ClickHouse password: " CLICKHOUSE_PASSWORD_INPUT
echo
read -r -s -p "New Grafana admin password: " GRAFANA_PASSWORD_INPUT
echo

if [[ -z "$OCI_REGION_INPUT" || -z "$OCI_BUCKET_INPUT" || -z "$OCI_COMPARTMENT_INPUT" || -z "$INGEST_TOKEN_INPUT" || -z "$CLICKHOUSE_PASSWORD_INPUT" || -z "$GRAFANA_PASSWORD_INPUT" ]]; then
  echo "Every value is required." >&2
  exit 1
fi

umask 077
RACKLENS_COMMIT_SHA_INPUT=$(git -C /opt/racklens rev-parse --short=12 HEAD)
printf '%s\n' \
  "OCI_REGION=$OCI_REGION_INPUT" \
  "OCI_BUCKET_NAME=$OCI_BUCKET_INPUT" \
  "OCI_COMPARTMENT_OCID=$OCI_COMPARTMENT_INPUT" \
  "OCI_INSTANCE_ID=instance-principal" \
  "RACKLENS_CLOUD_PROVIDER=oci" \
  "RACKLENS_COMMIT_SHA=$RACKLENS_COMMIT_SHA_INPUT" \
  "RACKLENS_HOSTED_INGEST_URL=$HOSTED_URL_INPUT" \
  "RACKLENS_INGEST_TOKEN=$INGEST_TOKEN_INPUT" \
  "CLICKHOUSE_PASSWORD=$CLICKHOUSE_PASSWORD_INPUT" \
  "GRAFANA_ADMIN_PASSWORD=$GRAFANA_PASSWORD_INPUT" \
  "COLLECTOR_MODE=simulator" \
  "COLLECTOR_INTERVAL_SECONDS=30" \
  "RACKLENS_SCENARIO=cooling_imbalance" \
  "RACKLENS_DATA_CENTER=OCI-PHX-01" \
  "RACKLENS_DATA_HALL=Hall A" \
  "RACKLENS_ROW=Row 02" \
  "REDFISH_BASE_URL=" \
  "REDFISH_USERNAME=" \
  "REDFISH_PASSWORD=" > "$ENV_FILE"
chmod 0600 "$ENV_FILE"
systemctl restart racklens-stack.service
systemctl start racklens-evaluator.service
echo "RackLens is active. No secret was written to Terraform state."
