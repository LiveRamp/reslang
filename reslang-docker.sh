#!/usr/bin/env bash

set -eu

RESLANG_IMG=us-central1-docker.pkg.dev/liveramp-eng/shared/api/reslang:master

usage() {
  cat <<USAGE

  Usage: run a Reslang container image on a specified directory.

  $ $0 RESLANG_DIR [ OPTS ...]

  Examples:

  $ $0 /abs/path/to/reslang_directory
  $ $0 /abs/path/to/reslang_directory --diagram diagram_name

  OPTS: The following options will **not** work with this script:

    --web, --open, --stripped, --testwrite, --testdir

  To use those options, please run reslang un-containerized.
USAGE

exit "$1"
}

# is_absolute_path indicates if a string is prefixed with a leading slash.
# It returns a 0 (success) code if the path is absolute, else 1 (error).
#   $1 : string
is_absolute_path() {
  case "$1" in
    /*) return 0 ;;
     *) return 1 ;;
  esac
}

# Run a reslang container on a user-specified directory.
# NOTE: The reslang directory's parent is mounted into the container, so that
# it can access imported resources from peers. In reslang, all imports refer
# to peer directories.
main() {
  if [ "$#" -lt 1 ]; then usage 1 ; fi

  local host_path; local workspace;
  host_path="$1" ; shift ;
  parent_dir="$(dirname "$host_path")"
  workspace=/app/reslang/workspace/

  if ! is_absolute_path "$host_path"; then
    printf "error: expected absolute path, got %s\n" "$host_path"
    usage 1
  fi

  docker run -v "$parent_dir":"$workspace" "$RESLANG_IMG" \
    "$workspace"/"$(basename "$host_path")" --stdout "$@"
}

main "$@"
