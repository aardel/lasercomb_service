#!/bin/bash

# Restart Script for Trip Cost Application
# Kills all dev ports and restarts backend + frontend

echo "🛑 Stopping all dev servers..."

# Kill processes on all CORS-allowed ports
for port in 3000 3001 3002 3003 5173 5174; do
  lsof -ti:$port | xargs -r kill -9 2>/dev/null
done

echo "✅ Ports cleared (3000-3003, 5173-5174)"

# Wait a moment for ports to be released
sleep 1

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting backend..."
cd "$SCRIPT_DIR/backend" && node src/app.js &

sleep 2

echo "🚀 Starting frontend..."
cd "$SCRIPT_DIR/frontend" && npm run dev &

echo ""
echo "✨ Application started!"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:3001 (or 5173)"
