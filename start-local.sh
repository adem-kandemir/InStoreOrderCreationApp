#!/bin/bash
# Start script for local development

echo -e "\033[32mStarting InStore Order Creation App...\033[0m"

# Start API server in background
echo -e "\033[33mStarting API server...\033[0m"
cd app/order-app/src/api && npm start &
API_PID=$!

# Wait a bit for API to start
sleep 3

# Start Angular app in background
echo -e "\033[33mStarting Angular app...\033[0m"
cd app/order-app && npm start &
ANGULAR_PID=$!

echo -e "\n\033[32mServers starting...\033[0m"
echo -e "\033[36mAPI Server: http://localhost:3000\033[0m"
echo -e "\033[36mAngular App: http://localhost:4200\033[0m"
echo -e "\n\033[90mPress Ctrl+C to stop all servers...\033[0m"

# Wait for Ctrl+C
trap "kill $API_PID $ANGULAR_PID; exit" INT
wait 