#!/bin/bash
set -e
export PACKAGE=api
export NAME=stellariscloud-staging-api
export AWS_ACCOUNT_ID=655565831641
export AWS_REGION=eu-west-1

sh ./deploy-aws.sh
