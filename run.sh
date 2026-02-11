#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Режим: dev (за замовчуванням) або prod
MODE="${1:-dev}"

if [ "$MODE" = "prod" ]; then
  export PORT=3001
  export VITE_PORT=5174
  echo "=== PROD mode (backend :3001, frontend :5174) ==="
else
  export PORT=3000
  export VITE_PORT=5173
  echo "=== DEV mode (backend :3000, frontend :5173) ==="
fi

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

# Ensure server dependencies are installed before syncing template
if [ ! -d "$root_dir/server/node_modules" ]; then
  echo "Installing server dependencies..."
  (cd "$root_dir/server" && npm install)
fi

# Initialize config.csv from template if not exists
if [ ! -f "$root_dir/data/config.csv" ] && [ -f "$root_dir/data/config.template.csv" ]; then
  echo "Ініціалізація config.csv з шаблону..."
  cp "$root_dir/data/config.template.csv" "$root_dir/data/config.csv"
fi

# Sync CSV template before starting services
echo "Синхронізація шаблону CSV..."
(cd "$root_dir/server" && node src/sync-template.js) || {
  echo "⚠️  Попередження: синхронізація шаблону не вдалася, продовжуємо запуск..."
}

start_service "server" "$root_dir/server" "npm run dev"
start_service "client" "$root_dir/client" "npm run dev"

wait
