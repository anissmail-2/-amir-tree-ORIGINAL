#!/bin/bash

# AI Wardrobe - Start Script
# Starts both backend and frontend servers

echo "╔════════════════════════════════════════╗"
echo "║   🚀 Starting AI Wardrobe System      ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Kill any existing processes
echo "🧹 Cleaning up old processes..."
pkill -f "node server.js" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null
sleep 2

# Start Backend
echo "🔧 Starting Backend Server..."
cd backend
node server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "   ✅ Backend running (PID: $BACKEND_PID)"
echo "   📍 http://localhost:5000"
cd ..

# Wait for backend to be ready
echo ""
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Start Frontend
echo "🎨 Starting Frontend..."
cd frontend
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   ✅ Frontend running (PID: $FRONTEND_PID)"
echo "   📍 http://localhost:3000"
cd ..

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   ✅ AI Wardrobe is Running!          ║"
echo "╠════════════════════════════════════════╣"
echo "║   Backend:  http://localhost:5000     ║"
echo "║   Frontend: http://localhost:3000     ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📋 Logs:"
echo "   Backend:  backend/backend.log"
echo "   Frontend: frontend/frontend.log"
echo ""
echo "⏹️  To stop: pkill -f 'node server.js' && pkill -f 'react-scripts'"
echo ""
