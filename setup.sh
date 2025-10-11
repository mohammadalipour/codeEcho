#!/bin/bash

# CodeEcho Setup Script
# This script helps you set up the environment quickly

set -e

echo "🚀 CodeEcho Environment Setup"
echo "=============================="

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Keeping existing .env file."
        exit 0
    fi
fi

# Copy .env.example to .env
echo "📋 Copying .env.example to .env..."
cp .env.example .env

# Generate a random JWT secret
echo "🔐 Generating secure JWT secret..."
if command -v openssl &> /dev/null; then
    JWT_SECRET=$(openssl rand -base64 32)
    # Escape special characters for sed
    JWT_SECRET_ESCAPED=$(echo "$JWT_SECRET" | sed 's/[[\.*^$()+?{|]/\\&/g')
    
    # Replace the JWT secret in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/CHANGE_ME_GENERATE_RANDOM_SECRET_FOR_PRODUCTION/$JWT_SECRET_ESCAPED/g" .env
    else
        # Linux
        sed -i "s/CHANGE_ME_GENERATE_RANDOM_SECRET_FOR_PRODUCTION/$JWT_SECRET_ESCAPED/g" .env
    fi
    echo "✅ JWT secret generated and updated in .env"
else
    echo "⚠️  OpenSSL not found. Please manually update JWT_SECRET in .env file"
fi

# Generate random database passwords
echo "🔑 Generating secure database passwords..."
if command -v openssl &> /dev/null; then
    ROOT_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)
    USER_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)
    
    # Escape special characters for sed
    ROOT_PASS_ESCAPED=$(echo "$ROOT_PASS" | sed 's/[[\.*^$()+?{|]/\\&/g')
    USER_PASS_ESCAPED=$(echo "$USER_PASS" | sed 's/[[\.*^$()+?{|]/\\&/g')
    
    # Replace passwords in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/change_me_root_password/$ROOT_PASS_ESCAPED/g" .env
        sed -i '' "s/change_me_user_password/$USER_PASS_ESCAPED/g" .env
    else
        # Linux
        sed -i "s/change_me_root_password/$ROOT_PASS_ESCAPED/g" .env
        sed -i "s/change_me_user_password/$USER_PASS_ESCAPED/g" .env
    fi
    echo "✅ Database passwords generated and updated in .env"
else
    echo "⚠️  OpenSSL not found. Please manually update database passwords in .env file"
fi

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Review and customize .env file if needed"
echo "   2. Start CodeEcho: make start"
echo "   3. Access the dashboard: http://localhost:3000"
echo ""
echo "🔧 Available commands:"
echo "   make help              - Show all available commands"
echo "   make start             - Start CodeEcho services"
echo "   make stop              - Stop CodeEcho services"
echo "   make migrate-db        - Run database migrations"
echo ""