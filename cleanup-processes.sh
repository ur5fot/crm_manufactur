#!/bin/bash

echo "🔍 Searching for Node.js processes..."

# Find all node processes running index.js or vite
NODE_PIDS=$(ps aux | grep -E 'node.*(index\.js|vite)' | grep -v grep | awk '{print $2}')

if [ -z "$NODE_PIDS" ]; then
  echo "✅ No orphaned Node.js processes found"
  exit 0
fi

# Count processes
COUNT=$(echo "$NODE_PIDS" | wc -l | xargs)

echo "🔴 Found $COUNT orphaned Node.js process(es)"
echo "📋 Process IDs: $NODE_PIDS"

# Kill processes
echo "$NODE_PIDS" | xargs kill -9 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Successfully killed $COUNT process(es)"
else
  echo "⚠️  Some processes may have already exited"
fi

# Verify cleanup
sleep 1
REMAINING=$(ps aux | grep -E 'node.*(index\.js|vite)' | grep -v grep | wc -l | xargs)

if [ "$REMAINING" -eq 0 ]; then
  echo "✅ All processes cleaned up successfully"
else
  echo "⚠️  Warning: $REMAINING process(es) still running"
fi
