#!/bin/bash

echo "Starting local development environment for Order App API..."

# Check if default-env.json exists
if [ ! -f default-env.json ]; then
    echo "ERROR: default-env.json not found!"
    echo ""
    echo "Please create default-env.json from the template:"
    echo "  cp default-env.json.template default-env.json"
    echo ""
    echo "Then update it with your service credentials from:"
    echo "  cf env InStoreOrderCreationApp"
    echo ""
    exit 1
fi

# Function to check if SSH tunnel is running
check_ssh_tunnel() {
    netstat -an | grep -q "127.0.0.1:8081"
    return $?
}

# Start SSH tunnel if not already running
if ! check_ssh_tunnel; then
    echo "Starting SSH tunnel to SAP Cloud Connector..."
    echo "Please run this command in a separate terminal:"
    echo ""
    echo "cf ssh InStoreOrderCreationApp -L localhost:8081:connectivityproxy.internal.cf.eu10-004.hana.ondemand.com:20003"
    echo ""
    echo "Press Enter when the SSH tunnel is established..."
    read
    
    # Check again
    if ! check_ssh_tunnel; then
        echo "SSH tunnel not detected. Please ensure the tunnel is running."
        exit 1
    fi
fi

echo "SSH tunnel detected on port 8081"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the API server
echo "Starting API server on port 3000..."
npm run dev 