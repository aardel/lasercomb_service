#!/bin/bash

# Script to clear all cached data (backend cache + frontend localStorage instructions)

echo "🧹 Clearing All Cached Data"
echo "============================"
echo ""

# Clear backend cache
echo "1. Clearing backend cache..."
cd "$(dirname "$0")/Trip Cost/backend"
if [ -f "scripts/clear-cache.js" ]; then
    node scripts/clear-cache.js
else
    echo "   ⚠️  Backend cache script not found"
fi

echo ""
echo "2. Frontend localStorage:"
echo "   To clear frontend cache, open your browser console and run:"
echo "   localStorage.clear();"
echo "   Or visit: http://localhost:5173 and open DevTools > Application > Local Storage > Clear All"
echo ""
echo "✅ Cache clearing complete!"

