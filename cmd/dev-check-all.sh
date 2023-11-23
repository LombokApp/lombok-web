#!/bin/bash
set -e

echo "Checking @stellariscloud/ui..."
yarn workspace @stellariscloud/ui prettier:check
yarn workspace @stellariscloud/ui ts:check
yarn workspace @stellariscloud/ui lint:check

echo "Checking @stellariscloud/api..."
yarn workspace @stellariscloud/api prettier:check
yarn workspace @stellariscloud/api ts:check
yarn workspace @stellariscloud/api lint:check

echo "Checking @stellariscloud/worker..."
yarn workspace @stellariscloud/worker prettier:check
yarn workspace @stellariscloud/worker ts:check
yarn workspace @stellariscloud/worker lint:check

echo "Checking @stellariscloud/api-utils..."
yarn workspace @stellariscloud/api-utils prettier:check
yarn workspace @stellariscloud/api-utils ts:check
yarn workspace @stellariscloud/api-utils lint:check

echo "Checking @stellariscloud/auth-utils..."
yarn workspace @stellariscloud/auth-utils prettier:check
yarn workspace @stellariscloud/auth-utils ts:check
yarn workspace @stellariscloud/auth-utils lint:check

echo "Checking @stellariscloud/types..."
yarn workspace @stellariscloud/types prettier:check
yarn workspace @stellariscloud/types ts:check
yarn workspace @stellariscloud/types lint:check

echo "Checking @stellariscloud/utils..."
yarn workspace @stellariscloud/utils prettier:check
yarn workspace @stellariscloud/utils ts:check
yarn workspace @stellariscloud/utils lint:check

echo "Checking @stellariscloud/workers..."
yarn workspace @stellariscloud/workers prettier:check
yarn workspace @stellariscloud/workers ts:check
yarn workspace @stellariscloud/workers lint:check

