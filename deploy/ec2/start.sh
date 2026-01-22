#!/bin/bash

# AI Carousel - EC2 Start Script
# This script builds the Next.js app and starts it using PM2.

set -e

APP_NAME="ai-carousel"

echo "🚀 Starting AI Carousel Deployment..."

# 1. Build the Application
echo "🏗️ Building Next.js application..."
pnpm build

# 2. Check/Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 not found. Installing global PM2..."
    sudo npm install -g pm2
fi

# 3. Start/Restart Application
echo "🔄 Starting application with PM2..."

# Check if app is already running
if pm2 list | grep -q "$APP_NAME"; then
    echo "♻️ Restarting existing process..."
    pm2 restart "$APP_NAME"
else
    echo "▶️ Starting new process..."
    pm2 start npm --name "$APP_NAME" -- start
fi

# 4. Save PM2 list
pm2 save

echo "✅ Deployment successful! App is running."
echo "📜 To view logs, run: pm2 logs $APP_NAME"
