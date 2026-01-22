#!/bin/bash

# AI Carousel - EC2 Setup Script
# This script installs necessary dependencies for the AI Carousel application on Ubuntu/Debian.

set -e  # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting AI Carousel System Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install System Dependencies
echo "🛠️ Installing system tools (Python, FFmpeg, build-essential)..."
sudo apt-get install -y python3 \
                        python3-pip \
                        python3-venv \
                        ffmpeg \
                        curl \
                        git \
                        build-essential

# Verify FFmpeg installation
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg installed successfully: $(ffmpeg -version | head -n 1)"
else
    echo "❌ FFmpeg installation failed!"
    exit 1
fi

# 3. Install Node.js (LTS version)
if ! command -v node &> /dev/null; then
    echo "🟢 Node.js not found. Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js is already installed: $(node -v)"
fi

# 4. Install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
else
    echo "✅ pnpm is already installed: $(pnpm -v)"
fi

# 5. Application Setup
echo "📂 Setting up application dependencies..."

# Install Python requirements
if [ -f "requirements.txt" ]; then
    echo "🐍 Installing Python dependencies..."
    # It is recommended to use a virtual environment, but for simple EC2 deployment, 
    # installing to user/system might be preferred by some. 
    # We will install globally for the user to avoid venv activation complexity for the user,
    # OR strictly follow best practice. Let's stick to simple pip install for this script 
    # but use --break-system-packages if on newer Ubuntu versions or suggest venv.
    # To be safe and simple for the "friendly" request:
    pip3 install -r requirements.txt --break-system-packages 2>/dev/null || pip3 install -r requirements.txt
else
    echo "⚠️ requirements.txt not found! Skipping Python setup."
fi

# Install Node requirements
if [ -f "package.json" ]; then
    echo "📦 Installing Node dependencies..."
    pnpm install
else
    echo "❌ package.json not found! Is this the correct directory?"
    exit 1
fi

echo "🎉 Setup complete! You can now configure your .env file and running the start script."
