#!/bin/bash
set -e

echo "Checking API..."
yarn workspace @stellariscloud/api lint:check
yarn workspace @stellariscloud/api prettier:check
yarn workspace @stellariscloud/api ts:check
echo "Checking UI..."
yarn workspace @stellariscloud/ui lint:check
yarn workspace @stellariscloud/ui prettier:check
yarn workspace @stellariscloud/ui ts:check
echo "Checking api-utils..."
yarn workspace @stellariscloud/api-utils lint:check
yarn workspace @stellariscloud/api-utils prettier:check
yarn workspace @stellariscloud/api-utils ts:check
echo "Checking auth-utils..."
yarn workspace @stellariscloud/auth-utils lint:check
yarn workspace @stellariscloud/auth-utils prettier:check
yarn workspace @stellariscloud/auth-utils ts:check
echo "Checking utils..."
yarn workspace @stellariscloud/utils lint:check
yarn workspace @stellariscloud/utils prettier:check
yarn workspace @stellariscloud/utils ts:check
echo "Checking types..."
yarn workspace @stellariscloud/types lint:check
yarn workspace @stellariscloud/types prettier:check
yarn workspace @stellariscloud/types ts:check
