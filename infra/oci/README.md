# RackLens on OCI Always Free

This deployment turns the portfolio demo into a real, source-linked product lab while keeping BMC access private. One Ampere A1 instance runs the GET-only collector, ClickHouse, Grafana, OpenTelemetry, the RackLens API, and a nightly 70-case evaluator. A private Object Storage bucket keeps full evaluation artifacts; OCI Monitoring receives five bounded quality metrics. The public Sites app receives only normalized telemetry and evaluation summaries over outbound HTTPS.

## Cost and security envelope

- `VM.Standard.A1.Flex`: 2 OCPUs and 12 GB RAM
- 100 GB boot volume
- One private, versioned Object Storage bucket
- OCI Bastion for SSH; the instance NSG has no internet-sourced ingress rule
- Instance principal with access only to the evaluation bucket and custom metrics
- Optional $1 and $5 actual-spend budget alerts
- No paid load balancer, NAT gateway, Kubernetes cluster, Autonomous GPU, or Generative AI endpoint

Always Free availability and capacity are tenancy- and region-dependent. Confirm the **Always Free Eligible** label in the Console before applying. Budgets alert; they do not hard-stop resources.

## What you provide

Do not send RackLens an Oracle password, private SSH key, API private key, auth token, or Redfish password. You only need these five non-secret/account-specific values:

1. `tenancy_ocid` — Profile menu → **Tenancy: your-name** → copy OCID.
2. `region` — use the home region shown in the Console header.
3. `ssh_public_key` — the contents of a `.pub` key, never the private key.
4. `operator_cidr` — your current public IPv4 plus `/32`; visit `https://ifconfig.me` from your own browser if needed.
5. `budget_alert_email` — where OCI should send the $1 and $5 alerts.

## Deploy from OCI Cloud Shell

Open **Developer tools → Cloud Shell** in the OCI Console. Cloud Shell already has the OCI CLI, Terraform, and a short-lived authenticated session.

```bash
git clone https://github.com/sivalinb/racklens-ai.git
cd racklens-ai/infra/oci
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
terraform init
terraform fmt -check
terraform validate
terraform plan -out racklens.plan
terraform apply racklens.plan
terraform output
```

Review the plan before `apply`. It should show one compartment, one A1 instance, networking, Bastion, one bucket, instance-principal policy, and two budget alert rules. Terraform state stays in your private Cloud Shell home; `terraform.tfvars` and state files are ignored by Git.

If `VM.Standard.A1.Flex` reports no capacity, change `availability_domain_index` to another valid index and re-plan. Do not substitute a paid shape merely to finish the demo.

## First secure activation

Wait until the instance Console shows cloud-init complete. In **Identity & Security → Bastion**, open `racklens-bastion`, create a **Managed SSH session**, target the private IP from `terraform output instance_private_ip`, port `22`, user `opc`, and your public key. Run the OCI-generated SSH command locally.

On the instance:

```bash
sudo /opt/racklens/infra/oci/scripts/configure-secrets.sh
sudo systemctl status racklens-stack.service --no-pager
sudo systemctl status racklens-evaluator.timer --no-pager
```

The prompt asks for the Terraform outputs plus three secrets you generate locally: a long hosted-ingest token, a ClickHouse password, and a Grafana password. They are written only to `/etc/racklens/racklens.env` with mode `0600`; they do not enter Terraform state or Git.

To reach the private interfaces, use the same Bastion session with local port forwards:

```bash
ssh -L 3001:127.0.0.1:3001 -L 8000:127.0.0.1:8000 <the rest of OCI's generated command>
```

Then open `http://localhost:3001` for Grafana and `http://localhost:8000/docs` for the API. ClickHouse and OTLP remain local to the instance.

## Connect real Redfish later

The default is the deterministic Redfish-shaped simulator. A cloud VM usually cannot reach an on-premises BMC safely. Run the same collector beside the management network, or first establish an approved Site-to-Site VPN. Never expose a BMC to the public internet.

For an authorized lab emulator or reachable test BMC, edit `/etc/racklens/racklens.env` through Bastion and set `COLLECTOR_MODE=redfish` plus `REDFISH_BASE_URL`, `REDFISH_USERNAME`, and `REDFISH_PASSWORD`. Restart with `sudo systemctl restart racklens-stack.service`. The implemented Redfish client is GET-only and performs no production write.

## Verify the proof chain

```bash
sudo systemctl start racklens-evaluator.service
sudo journalctl -u racklens-evaluator.service -n 100 --no-pager
sudo docker compose --env-file /etc/racklens/racklens.env -f /opt/racklens/infra/docker-compose.yml -f /opt/racklens/infra/docker-compose.oci.yml ps
```

In OCI, verify:

- Object Storage → the private bucket → `evaluations/<run-id>.json`
- Monitoring → Metrics Explorer → namespace `racklens_ai`
- Public RackLens → `/cloud-lab` → provider `oci-always-free`, region, commit, and the same run metrics

## Teardown

From the same Cloud Shell directory, first review `terraform plan -destroy`, then use `terraform destroy` when you no longer need the lab. The bucket is versioned; remove retained object versions through the OCI Console before destroy if OCI refuses to delete it.

## Official references

- [OCI Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [OCI Cloud Shell](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/cloudshellintro.htm)
- [OCI dynamic groups](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingdynamicgroups.htm)
- [OCI budgets](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm)
- [OCI Terraform instance resource](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_instance)
- [OCI Terraform Bastion resource](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/bastion_bastion)
