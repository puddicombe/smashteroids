#!/bin/bash

# Asteroids Game Setup Script
echo "Setting up Asteroids Game with High Score Server..."
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js and try again."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "⚠️  Warning: Node.js version $NODE_VERSION detected."
    echo "   It's recommended to use Node.js v14 or higher."
    echo "   Continue anyway? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

echo "✅ Node.js v$(node -v) detected"

# Install server dependencies
echo -e "\nInstalling server dependencies..."
cd server || { echo "❌ Server directory not found"; exit 1; }
npm install

# Check if installation was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to install server dependencies."
    exit 1
fi

echo "✅ Server dependencies installed successfully"

# Return to root directory
cd ..

echo -e "\n=================================================="
echo "✅ Setup completed successfully!"
echo -e "\nTo start the server, run:"
echo "   cd server && npm start"
echo -e "\nThen open your browser and navigate to:"
echo "   http://localhost:3000"
echo -e "\nEnjoy playing Asteroids!"
echo "==================================================" 