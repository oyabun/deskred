#!/bin/bash

echo "======================================"
echo "DESKRED OSINT Platform - Build Script"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Create network if it doesn't exist
if ! docker network inspect osint-network > /dev/null 2>&1; then
    echo "📡 Creating osint-network..."
    docker network create osint-network
    echo "✓ Network created"
else
    echo "✓ Network osint-network already exists"
fi
echo ""

# Build tools
tools=("maigret" "sherlock" "holehe" "theharvester" "recon-ng" "social-analyzer" "spiderfoot")
total=${#tools[@]}
current=0

echo "🔨 Building OSINT tool images (this may take 10-20 minutes)..."
echo ""

for tool in "${tools[@]}"; do
    ((current++))
    echo "[$current/$total] Building $tool..."
    if docker-compose build "$tool" > /dev/null 2>&1; then
        echo "✓ $tool built successfully"
    else
        echo "❌ Failed to build $tool"
    fi
    echo ""
done

echo "======================================"
echo "✓ Build complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Start the platform: docker-compose up -d backend frontend redis"
echo "2. Access the UI at: http://localhost:5173"
echo "3. API docs at: http://localhost:8000/docs"
echo ""
