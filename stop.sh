#!/bin/bash

echo "Останавливаем серверы..."

# Останавливаем процесс на порту 3000 (backend)
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "Останавливаем backend (port 3000)..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  echo "✓ Backend остановлен"
else
  echo "Backend уже остановлен"
fi

# Останавливаем процесс на порту 5173 (frontend)
if lsof -ti:5173 > /dev/null 2>&1; then
  echo "Останавливаем frontend (port 5173)..."
  lsof -ti:5173 | xargs kill -9 2>/dev/null
  echo "✓ Frontend остановлен"
else
  echo "Frontend уже остановлен"
fi

# Останавливаем процесс на порту 5174 (альтернативный frontend)
if lsof -ti:5174 > /dev/null 2>&1; then
  echo "Останавливаем frontend (port 5174)..."
  lsof -ti:5174 | xargs kill -9 2>/dev/null
  echo "✓ Frontend (5174) остановлен"
fi

echo "Все серверы остановлены"
