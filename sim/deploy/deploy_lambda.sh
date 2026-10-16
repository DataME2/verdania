#!/usr/bin/env bash
# Deploy the engine to AWS Lambda behind a Function URL. Safe to re-run: creates on first run, updates after.
#
#   AWS_PROFILE=verdania bash deploy/deploy_lambda.sh          # from sim/, after build_lambda.py
#
# Creates/updates: IAM role verdania-sim-lambda (logs only), Lambda function verdania-sim (python3.12, arm64,
# 2 GB, 30 s), a public Function URL (requests still need the X-Sim-Key header), and 14-day log retention.
# The shared key is generated once, stored in the function's environment, and copied to $KEY_FILE for the
# website's SIM_API_KEY. It is never printed. Set ROTATE_KEY=1 to replace it.
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
FUNCTION="verdania-sim"
ROLE="verdania-sim-lambda"
ZIP="dist/verdania-sim-lambda.zip"
KEY_FILE="${KEY_FILE:-${TEMP:-/tmp}/verdania_prod_sim_key.txt}"
export AWS_REGION="$REGION" AWS_PAGER=""
aws_() { aws --region "$REGION" "$@"; }

[[ -f "$ZIP" ]] || { echo "missing $ZIP: run deploy/build_lambda.py first"; exit 1; }
echo "account: $(aws_ sts get-caller-identity --query Account --output text)  region: $REGION"

# --- role (CloudWatch logs only)
if ! ROLE_ARN=$(aws_ iam get-role --role-name "$ROLE" --query Role.Arn --output text 2>/dev/null); then
  ROLE_ARN=$(aws_ iam create-role --role-name "$ROLE" --query Role.Arn --output text --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}')
  aws_ iam attach-role-policy --role-name "$ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "created role; waiting for IAM to propagate"; sleep 12
fi

# --- shared key: keep the deployed one unless asked to rotate
EXISTING_KEY=$(aws_ lambda get-function-configuration --function-name "$FUNCTION" \
  --query 'Environment.Variables.SIM_API_KEY' --output text 2>/dev/null || true)
if [[ -n "$EXISTING_KEY" && "$EXISTING_KEY" != "None" && "${ROTATE_KEY:-0}" != "1" ]]; then KEY="$EXISTING_KEY"
else KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))"); fi
ENV_FILE=$(mktemp); trap 'rm -f "$ENV_FILE"' EXIT
python -c "import json,sys; print(json.dumps({'Variables': {'SIM_API_KEY': sys.argv[1]}}))" "$KEY" > "$ENV_FILE"
printf '%s' "$KEY" > "$KEY_FILE"
ENV_PATH=$(cygpath -w "$ENV_FILE" 2>/dev/null || echo "$ENV_FILE")  # aws.exe on Windows needs a Windows path

# --- function
COMMON=(--runtime python3.12 --handler verdania_sim.lambda_handler.handler --memory-size 2048 --timeout 30
        --environment "file://$ENV_PATH")
if aws_ lambda get-function --function-name "$FUNCTION" >/dev/null 2>&1; then
  aws_ lambda update-function-code --function-name "$FUNCTION" --zip-file "fileb://$ZIP" >/dev/null
  aws_ lambda wait function-updated-v2 --function-name "$FUNCTION"
  aws_ lambda update-function-configuration --function-name "$FUNCTION" "${COMMON[@]}" >/dev/null
  echo "updated function"
else
  aws_ lambda create-function --function-name "$FUNCTION" --role "$ROLE_ARN" --architectures arm64 \
    --zip-file "fileb://$ZIP" "${COMMON[@]}" >/dev/null
  aws_ lambda wait function-active-v2 --function-name "$FUNCTION"
  echo "created function"
fi
aws_ lambda wait function-updated-v2 --function-name "$FUNCTION"

# --- public URL (the key check happens inside the function)
if ! URL=$(aws_ lambda get-function-url-config --function-name "$FUNCTION" --query FunctionUrl --output text 2>/dev/null); then
  URL=$(aws_ lambda create-function-url-config --function-name "$FUNCTION" --auth-type NONE --query FunctionUrl --output text)
  aws_ lambda add-permission --function-name "$FUNCTION" --statement-id public-url \
    --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE >/dev/null
  aws_ lambda add-permission --function-name "$FUNCTION" --statement-id public-url-invoke \
    --action lambda:InvokeFunction --principal '*' --invoked-via-function-url >/dev/null
  echo "created function URL"
fi

# --- logs: keep two weeks
aws_ logs create-log-group --log-group-name "/aws/lambda/$FUNCTION" 2>/dev/null || true
aws_ logs put-retention-policy --log-group-name "/aws/lambda/$FUNCTION" --retention-in-days 14

URL="${URL%/}"
echo "health: $(curl -s "$URL/v1/health")"
echo "SIM_URL=$URL"
echo "SIM_API_KEY written to $KEY_FILE (not shown)"
