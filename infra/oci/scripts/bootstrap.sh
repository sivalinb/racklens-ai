#!/bin/bash
set -euo pipefail

install -d -m 0700 /etc/racklens
install -d -m 0755 /opt/racklens
if [[ ! -f /etc/racklens/racklens.env ]]; then
  install -m 0600 /opt/racklens/infra/oci/racklens.env.template /etc/racklens/racklens.env
fi
systemctl daemon-reload
install -m 0644 /opt/racklens/infra/oci/systemd/racklens-stack.service /etc/systemd/system/racklens-stack.service
install -m 0644 /opt/racklens/infra/oci/systemd/racklens-evaluator.service /etc/systemd/system/racklens-evaluator.service
install -m 0644 /opt/racklens/infra/oci/systemd/racklens-evaluator.timer /etc/systemd/system/racklens-evaluator.timer
systemctl daemon-reload
systemctl enable docker racklens-stack.service racklens-evaluator.timer

echo "RackLens installed. Run sudo /opt/racklens/infra/oci/scripts/configure-secrets.sh to activate it."
