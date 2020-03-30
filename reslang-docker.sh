#!/usr/bin/env bash

set -eu

echo "This only accepts absolute paths e.g. /User/a/b/models/"

FULL_PATH=$1
echo "Reslang files to read: $FULL_PATH"

DIR_NAME=$(basename "$FULL_PATH")
SRC_PATH="/app/reslang/${DIR_NAME}"
echo ${SRC_PATH}

docker run -v "${FULL_PATH}:${SRC_PATH}" gcr.io/liveramp-eng/reslang:master ${SRC_PATH} --stdout
