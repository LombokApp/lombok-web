#!/usr/bin/env sh

# Ensure the generated spec is up to date
bun run metadata:generate
if [[ $? -eq 0 ]]; then
  echo "Metadata generation SUCCESS"
else
  echo "Metadata generation FAILURE"
  exit 1
fi
result=$?

# Check the result
if [ $result -ne 0 ]; then
    exit $result
fi

ROOT_DIR="${PWD}/../../"
SRC_PATH="packages/api/"
PUBLIC_API_OUT_PATH="packages/api-client/"

buildclients() {
  OUT_PATH="$1"
  SPEC_FILENAME="$2"

  # Clean previously generated API client
  [ -d "${ROOT_DIR}${OUT_PATH}src/" ] && rm -r "${ROOT_DIR}${OUT_PATH}src/"
  [ -d "${ROOT_DIR}${OUT_PATH}dist/" ] && rm -r "${ROOT_DIR}${OUT_PATH}dist/"

  mkdir "${ROOT_DIR}${OUT_PATH}src/"

  # Generate API client package sources using the openapi-generator-cli docker
  # image (we are running it this way as opposed to installing it from npm since
  # the cli requires Java on the host env).
  docker run --rm -u $(id -u ${USER}):$(id -g ${USER}) \
    -v ${ROOT_DIR}:/local \
    openapitools/openapi-generator-cli:v7.10.0 generate \
    -i "/local/${SRC_PATH}src/${SPEC_FILENAME}" \
    --skip-validate-spec \
    -g typescript-axios \
    -o /local/${OUT_PATH}src \
    --additional-properties useSingleRequestParameter=true

  # Clean up unwanted cruft created by the generator
  rm -r "${ROOT_DIR}${OUT_PATH}src/.openapi-generator"
  rm "${ROOT_DIR}${OUT_PATH}src/.gitignore"
  rm "${ROOT_DIR}${OUT_PATH}src/.npmignore"
  rm "${ROOT_DIR}${OUT_PATH}src/.openapi-generator-ignore"
  rm "${ROOT_DIR}${OUT_PATH}src/git_push.sh"

  { set +x; } 2>/dev/null
  echo "export const schema = $(cat "${ROOT_DIR}${SRC_PATH}src/${SPEC_FILENAME}" ) as const;" > "${ROOT_DIR}${OUT_PATH}src/schema.ts"
  set -x

  echo "export * from './schema';" >> "${ROOT_DIR}${OUT_PATH}src/index.ts"

  { set +x; } 2>/dev/null
}

buildclients "${PUBLIC_API_OUT_PATH}" "openapi.json"

# Transpile generated .ts sources to js
(cd "${ROOT_DIR}${PUBLIC_API_OUT_PATH}" && bun run build:clean)
