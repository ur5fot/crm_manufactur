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

echo "Всі сервери ($MODE) зупинено"
