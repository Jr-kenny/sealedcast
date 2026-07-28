#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-2}"
PARAMETER_PATH="${SEALEDCAST_PARAMETER_PATH:-/sealedcast/production}"
REPOSITORY_DIR="${SEALEDCAST_REPOSITORY_DIR:-/opt/sealedcast}"
ENV_FILE="${REPOSITORY_DIR}/.env.production"
TEMP_ENV="$(mktemp /tmp/sealedcast-production-env.XXXXXX)"
PARAMETERS_JSON="$(mktemp /tmp/sealedcast-production-parameters.XXXXXX)"

cleanup() {
  rm -f "$TEMP_ENV" "$PARAMETERS_JSON"
}
trap cleanup EXIT
umask 077

aws ssm get-parameters-by-path \
  --region "$AWS_REGION" \
  --path "$PARAMETER_PATH" \
  --recursive \
  --with-decryption \
  --output json >"$PARAMETERS_JSON"

python3 -c '
import json
import os
import sys

parameters = json.load(sys.stdin).get("Parameters", [])
values = {os.path.basename(item["Name"]): item["Value"] for item in parameters}
required = {
    "API_DOMAIN",
    "APP_FID",
    "APP_MNEMONIC",
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
    "DISCORD_TOKEN_ENCRYPTION_KEY",
    "NEYNAR_API_KEY",
    "NEXT_PUBLIC_NEYNAR_CLIENT_ID",
    "NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS",
    "NEXT_PUBLIC_SEPOLIA_RPC_URL",
    "NEXT_PUBLIC_URL",
    "NEXT_PUBLIC_WALLETCONNECT_ID",
    "POSTGRES_PASSWORD",
    "REDIS_PASSWORD",
    "SEALED_CAST_REGISTRY_ADDRESS",
    "SEALED_IDENTITY_ENCRYPTION_KEY",
    "SEALED_CAST_RELAYER_PRIVATE_KEY",
    "SEALED_CAST_WALLET_VERIFIER_PRIVATE_KEY",
    "SEPOLIA_RPC_URL",
    "TARGET_SIGNER_FID",
}
missing = sorted(required.difference(values))
if missing:
    print("Missing production parameters: " + ", ".join(missing), file=sys.stderr)
    raise SystemExit(1)
for name in sorted(values):
    print(f"{name}={json.dumps(str(values[name]))}")
' <"$PARAMETERS_JSON" >"$TEMP_ENV"

install -m 0600 "$TEMP_ENV" "$ENV_FILE"
cd "$REPOSITORY_DIR"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml config --quiet
docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml up \
  --detach \
  --build \
  --remove-orphans

for attempt in $(seq 1 40); do
  if curl --fail --silent --show-error \
    --resolve "${API_DOMAIN}:443:127.0.0.1" \
    "https://${API_DOMAIN}/api/health" >/dev/null; then
    echo "SealedCast backend is healthy at https://${API_DOMAIN}"
    exit 0
  fi
  sleep 3
done

docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml ps
echo "SealedCast backend did not become healthy in time" >&2
exit 1
