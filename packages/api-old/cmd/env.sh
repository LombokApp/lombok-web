#!/usr/bin/env sh
set -e

if [ -n "${CMD_ENV+1}" ] && [ "$SET_CMD_ENV" != "$CMD_ENV" ] && [ -f "./env/env.$CMD_ENV" ]; then
  set -a
  set -x
  source ./env/env.${CMD_ENV}
  { set +x; } 2>/dev/null
  export SET_CMD_ENV="$CMD_ENV"
fi

