#!/usr/bin/env bash

set -eu

RESLANG_IMG=gcr.io/liveramp-eng/reslang:master

usage() {
  cat <<USAGE

  Usage: run a Reslang container image on a specified directory.

  $ $0 [ RESLANG_DIR ] [ OPTS ...]

  Examples:

  $ $0 /abs/path/to/reslang_directory
  $ $0 /abs/path/to/reslang_directory --diagram diagram_name

  OPTS: All options available to Reslang can be passed to this script.
USAGE

exit "$1"
}

# is_absolute_path indicates if a string is prefixed with a leading slash.
# It returns a 0 (success) code if the path is absolute, else 1 (error).
#   $1 : string
is_absolute_path() {
  case "$1" in
    /*) : 0 ;;
    *) : 1 ;;
  esac

  return "$_"
}

main() {
  local host_path; local mount_path;
  host_path="$1" ; shift ;
  mount_path=/app/reslang/"$(basename "$host_path")"

  if ! is_absolute_path "$host_path"; then
    printf "error: expected absolute path, got %s\n" "$host_path"
    usage 1
  fi

  docker run -v "${host_path}:${mount_path}" "$RESLANG_IMG" \
    "${mount_path}" --stdout "$@"
}

main "$@"
