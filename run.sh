#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not found in PATH"
  exit 1
fi

pids=()

cleanup() {
  if [ ${#pids[@]} -gt 0 ]; then
    echo "Stopping services..."
    kill "${pids[@]}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

start_service() {
  local name="$1"
  local dir="$2"
  local cmd="$3"

  if [ ! -d "$dir/node_modules" ]; then
    echo "Installing dependencies for $name..."
    (cd "$dir" && npm install)
  fi

  echo "Starting $name..."
  (cd "$dir" && $cmd) &
  pids+=("$!")
}

start_service "server" "$root_dir/server" "npm run dev"
start_service "client" "$root_dir/client" "npm run dev"

wait
