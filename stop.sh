#!/bin/bash

# AI Wardrobe - Stop Script
# Stops both backend and frontend servers

echo "🛑 Stopping AI Wardrobe..."
echo ""

# Kill backend
pkill -f "node server.js" 2>/dev/null && echo "   ✅ Backend stopped" || echo "   ℹ️  Backend was not running"

# Kill frontend
pkill -f "react-scripts start" 2>/dev/null && echo "   ✅ Frontend stopped" || echo "   ℹ️  Frontend was not running"

echo ""
echo "✅ AI Wardrobe stopped!"
