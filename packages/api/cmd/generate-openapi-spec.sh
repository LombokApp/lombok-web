#!/usr/bin/env sh

ROOT_DIR="${PWD}/../../"
SRC_PATH="packages/api/"
PUBLIC_API_OUT_PATH="packages/types/"

# buildclients "${PUBLIC_API_OUT_PATH}" "openapi.json"
bunx openapi-typescript src/openapi.json -o ${ROOT_DIR}${PUBLIC_API_OUT_PATH}src/api-paths.d.ts

# Transpile generated .ts sources to js
(cd "${ROOT_DIR}${PUBLIC_API_OUT_PATH}" && bun run build:clean)
