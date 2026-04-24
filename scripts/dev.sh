#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PORT=18230
VITE_PORT=5173
PIDS=()

cleanup() {
  echo ""
  echo "[dev] Shutting down..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "[dev] All processes stopped."
}
trap cleanup EXIT INT TERM

get_lan_ip() {
  if command -v ipconfig &>/dev/null; then
    ipconfig getifaddr en0 2>/dev/null || echo "127.0.0.1"
  else
    hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1"
  fi
}

wait_for_url() {
  local url=$1 name=$2 max_retries=${3:-30}
  local i=0
  while [ $i -lt $max_retries ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "[dev] $name is ready."
      return 0
    fi
    i=$((i + 1))
    sleep 0.5
  done
  echo "[dev] ERROR: $name failed to start after $((max_retries / 2))s"
  return 1
}

LAN_IP=$(get_lan_ip)
echo "============================================"
echo "  YourMemo Dev Server"
echo "============================================"
echo "[dev] LAN IP: $LAN_IP"
echo "[dev] Backend: http://$LAN_IP:$BACKEND_PORT"
echo "[dev] Renderer: http://localhost:$VITE_PORT"
echo "============================================"
echo ""

# 1. Activate Python venv
VENV_DIR="$ROOT_DIR/backend/.venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "[dev] Creating Python venv..."
  python3 -m venv "$VENV_DIR"
  source "$VENV_DIR/bin/activate"
  pip install -r "$ROOT_DIR/backend/requirements.txt" -q
else
  source "$VENV_DIR/bin/activate"
fi

# 2. Start FastAPI backend (0.0.0.0 for LAN access)
echo "[dev] Starting FastAPI backend..."
cd "$ROOT_DIR/backend"
YOURMEMO_DEV=1 python3 -m uvicorn main:app --reload --host 0.0.0.0 --port $BACKEND_PORT &
PIDS+=($!)
cd "$ROOT_DIR"

# 3. Start Vite dev server
echo "[dev] Starting Vite dev server..."
npx vite --config vite.config.ts &
PIDS+=($!)

# 4. Wait for both services
wait_for_url "http://127.0.0.1:$BACKEND_PORT/health" "FastAPI"
wait_for_url "http://127.0.0.1:$VITE_PORT" "Vite"

# 5. Compile & launch Electron
echo "[dev] Starting Electron..."
npx tsc -p tsconfig.node.json
npx electron dist/main/index.js &
PIDS+=($!)

echo ""
echo "[dev] All services running. Press Ctrl+C to stop."
echo "[dev] Mobile devices connect to: http://$LAN_IP:$BACKEND_PORT"
echo ""

wait
