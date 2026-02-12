#!/bin/bash

# Режим: dev (за замовчуванням) або prod
MODE="${1:-dev}"

if [ "$MODE" = "prod" ]; then
  BACKEND_PORT=3001
  FRONTEND_PORT=5174
else
  BACKEND_PORT=3000
  FRONTEND_PORT=5173
fi

echo "Зупиняємо сервери ($MODE)..."

# Stop processes by port first
if lsof -ti:"$BACKEND_PORT" > /dev/null 2>&1; then
  echo "Зупиняємо backend (port $BACKEND_PORT)..."
  lsof -ti:"$BACKEND_PORT" | xargs kill -9 2>/dev/null
  echo "✓ Backend зупинено"
else
  echo "Backend вже зупинено"
fi

if lsof -ti:"$FRONTEND_PORT" > /dev/null 2>&1; then
  echo "Зупиняємо frontend (port $FRONTEND_PORT)..."
  lsof -ti:"$FRONTEND_PORT" | xargs kill -9 2>/dev/null
  echo "✓ Frontend зупинено"
else
  echo "Frontend вже зупинено"
fi

# Kill all orphaned node processes (index.js and vite)
echo "Перевіряємо наявність залишкових процесів..."

ORPHANED_COUNT=0

# Kill all node processes running index.js
INDEX_PIDS=$(ps aux | grep "[n]ode.*index.js" | awk '{print $2}')
if [ -n "$INDEX_PIDS" ]; then
  echo "Знайдено процеси node index.js: $(echo $INDEX_PIDS | wc -w)"
  echo "$INDEX_PIDS" | xargs kill -9 2>/dev/null
  ORPHANED_COUNT=$((ORPHANED_COUNT + $(echo $INDEX_PIDS | wc -w)))
fi

# Kill all node processes running vite
VITE_PIDS=$(ps aux | grep "[n]ode.*vite" | awk '{print $2}')
if [ -n "$VITE_PIDS" ]; then
  echo "Знайдено процеси vite: $(echo $VITE_PIDS | wc -w)"
  echo "$VITE_PIDS" | xargs kill -9 2>/dev/null
  ORPHANED_COUNT=$((ORPHANED_COUNT + $(echo $VITE_PIDS | wc -w)))
fi

# Kill all node --watch processes
WATCH_PIDS=$(ps aux | grep "[n]ode --watch" | awk '{print $2}')
if [ -n "$WATCH_PIDS" ]; then
  echo "Знайдено процеси node --watch: $(echo $WATCH_PIDS | wc -w)"
  echo "$WATCH_PIDS" | xargs kill -9 2>/dev/null
  ORPHANED_COUNT=$((ORPHANED_COUNT + $(echo $WATCH_PIDS | wc -w)))
fi

if [ $ORPHANED_COUNT -gt 0 ]; then
  echo "✓ Вбито $ORPHANED_COUNT залишкових процесів"
else
  echo "✓ Залишкові процеси не знайдено"
fi

echo "Всі сервери ($MODE) зупинено"
