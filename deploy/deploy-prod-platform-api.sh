#!/bin/bash
set -e
export PACKAGE=api
export NAME=stellariscloud-prod-api
export AWS_ACCOUNT_ID=655565831641
export AWS_REGION=us-east-2

sh ./deploy-aws.sh
