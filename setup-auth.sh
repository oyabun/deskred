#!/bin/bash
# Setup script for DESKRED Basic Authentication

echo "🔐 DESKRED Authentication Setup"
echo "================================"
echo ""

# Check if Caddy is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    exit 1
fi

echo "This script will help you set up password protection for DESKRED"
echo ""

# Get username
read -p "Enter username (default: admin): " USERNAME
USERNAME=${USERNAME:-admin}

# Get password
echo ""
read -sp "Enter password: " PASSWORD
echo ""
read -sp "Confirm password: " PASSWORD2
echo ""

if [ "$PASSWORD" != "$PASSWORD2" ]; then
    echo "❌ Passwords don't match!"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    echo "❌ Password cannot be empty!"
    exit 1
fi

echo ""
echo "⏳ Generating password hash..."

# Generate hash using Caddy in Docker
HASH=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$PASSWORD")

if [ -z "$HASH" ]; then
    echo "❌ Failed to generate hash"
    exit 1
fi

echo "✅ Hash generated!"
echo ""

# Update Caddyfile
echo "📝 Updating Caddyfile..."
sed -i.bak "s|admin \$2a.*|$USERNAME $HASH|" Caddyfile

echo "✅ Caddyfile updated!"
echo ""
echo "📋 Configuration:"
echo "   Username: $USERNAME"
echo "   Password: ********"
echo ""
echo "🚀 Next steps:"
echo "   1. Push changes: git add Caddyfile docker-compose.yml && git commit -m 'Add authentication' && git push"
echo "   2. On server: cd /opt/deskred && git pull"
echo "   3. Open firewall: ufw allow 443/tcp && ufw allow 80/tcp"
echo "   4. Start Caddy: docker compose up -d caddy"
echo ""
echo "🌐 Access DESKRED at: https://91.98.234.148"
echo "   (Accept the security warning for self-signed certificate)"
echo ""
