#!/bin/sh
set -e

if [ "${CONFIGURATION}" != "Release" ]; then
  exit 0
fi

HERMES_BIN="$(find "${PODS_ROOT}/hermes-engine" -path "*/ios-arm64/hermes.framework/hermes" -type f 2>/dev/null | head -n 1)"

if [ -z "$HERMES_BIN" ]; then
  echo "warning: Hermes binary not found, skipping dSYM generation"
  exit 0
fi

DSYM_OUTPUT="${DWARF_DSYM_FOLDER_PATH}/hermes.framework.dSYM"

if [ -d "$DSYM_OUTPUT" ]; then
  echo "Hermes dSYM already present at ${DSYM_OUTPUT}"
  exit 0
fi

echo "Generating Hermes dSYM from ${HERMES_BIN}"
dsymutil "$HERMES_BIN" -o "$DSYM_OUTPUT"
