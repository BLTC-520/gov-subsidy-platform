#!/bin/bash

# Start All Services Script
# This script starts all the services for the Gov Subsidy Platform

set -e

echo "🚀 Starting all services for Gov Subsidy Platform..."

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to start a service in the background
start_service() {
    local name=$1
    local dir=$2
    local command=$3
    local port=$4
    
    echo -e "\n${BLUE}📦 Starting $name on port $port...${NC}"
    
    cd "$dir"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Installing dependencies for $name...${NC}"
        npm install
    fi
    
    # Start the service in background
    $command &
    local pid=$!
    
    # Store PID for cleanup
    echo $pid > "/tmp/gov-subsidy-$name.pid"
    
    echo -e "${GREEN}✅ $name started with PID: $pid${NC}"
    
    # Go back to root directory
    cd - > /dev/null
}

# Cleanup function to kill all services
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"
    
    # Kill processes by PID files
    for service in frontend backend-zk backend-lhdn; do
        pid_file="/tmp/gov-subsidy-$service.pid"
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file")
            if kill -0 $pid 2>/dev/null; then
                kill $pid
                echo -e "${GREEN}✅ Stopped $service (PID: $pid)${NC}"
            fi
            rm -f "$pid_file"
        fi
    done
    
    echo -e "${GREEN}🎉 All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C and call cleanup function
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo -e "${RED}❌ Please run this script from the gov-subsidy-platform root directory${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Checking port availability...${NC}"

# Check if ports are available
check_port 5173 # Frontend (Vite)
check_port 3001 # Mock LHDN API
check_port 3002 # ZK Circuit Service

echo -e "\n${GREEN}🎯 All ports are available. Starting services...${NC}"

# Start Frontend (Vite dev server - port 5173)
start_service "frontend" "frontend" "npm run dev" "5173"

# Start Mock LHDN API (port 3001)
start_service "backend-lhdn" "backend/mock-lhdn-api" "npm run dev" "3001"

# Start ZK Circuit Service (port 3002)  
start_service "backend-zk" "backend" "npm run dev" "3002"

echo -e "\n${GREEN}🎉 All services started successfully!${NC}"
echo -e "\n${BLUE}📋 Service URLs:${NC}"
echo -e "  • Frontend:        ${GREEN}http://localhost:5173${NC}"
echo -e "  • Mock LHDN API:   ${GREEN}http://localhost:3001${NC}"
echo -e "  • ZK Service:      ${GREEN}http://localhost:3002${NC}"
echo -e "  • ZK Swagger Docs: ${GREEN}http://localhost:3002/api-docs${NC}"

echo -e "\n${YELLOW}💡 Tips:${NC}"
echo -e "  • Press Ctrl+C to stop all services"
echo -e "  • Check logs above for any startup errors"
echo -e "  • Frontend hot-reload is enabled"

echo -e "\n${BLUE}⏳ Services are running... Press Ctrl+C to stop all services${NC}"

# Wait for all background processes
wait