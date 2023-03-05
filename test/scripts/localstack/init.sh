#!/usr/bin/env bash
 
set -euo pipefail
 
echo "configuring localstack"
echo "==================="
LOCALSTACK_HOST=localhost
AWS_REGION=eu-west-1

# https://docs.localstack.cloud/user-guide/aws/cloudwatch/