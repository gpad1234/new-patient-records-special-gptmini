#!/bin/bash

# Interactive Test Script for Patient Records Socket Server
# Automatically runs server, executes test commands, and cleans up

set -e

JAR_FILE="target/patient-records-java-service-1.0.0.jar"
TEST_PORT=9996
SERVER_PID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}➜${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        print_status "Stopping server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        sleep 1
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Check if JAR exists
if [ ! -f "$JAR_FILE" ]; then
    print_error "JAR file not found: $JAR_FILE"
    print_info "Run 'mvn clean package' first"
    exit 1
fi

echo ""
print_status "Patient Records - TCP Client-Server Test"
echo ""

# Build project
print_status "Building project..."
mvn clean package -q 2>&1 | grep -E "ERROR|BUILD" || true
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi
print_success "Build successful"
echo ""

# Start server
print_status "Starting server on port $TEST_PORT..."
java -cp "$JAR_FILE" com.healthcare.java.patient.SocketServer $TEST_PORT &
SERVER_PID=$!
print_success "Server started (PID: $SERVER_PID)"
sleep 1

echo ""
print_status "Running interactive tests..."
echo ""

# Function to send command and get response
send_command() {
    local cmd=$1
    local expected=$2
    echo "$cmd" | timeout 2 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | grep -q "$expected"
}

# Test 1: CREATE patient
print_info "Test 1: CREATE patient"
(
    echo "CREATE \"John Doe\" john@test.com 555-1234 1990-05-15"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -20
print_success "CREATE command executed"
echo ""

# Test 2: CREATE another patient
print_info "Test 2: CREATE second patient"
(
    echo "CREATE \"Jane Smith\" jane@test.com 555-5678 1992-03-20"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -20
print_success "CREATE command executed"
echo ""

# Test 3: LIST patients
print_info "Test 3: LIST all patients"
(
    echo "LIST"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -40
print_success "LIST command executed"
echo ""

# Test 4: SEARCH by name
print_info "Test 4: SEARCH by name"
(
    echo "SEARCH John"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -25
print_success "SEARCH command executed"
echo ""

# Test 5: COUNT patients
print_info "Test 5: COUNT total patients"
(
    echo "COUNT"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -10
print_success "COUNT command executed"
echo ""

# Test 6: GET patient
print_info "Test 6: GET patient by ID"
(
    echo "GET 1"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -20
print_success "GET command executed"
echo ""

# Test 7: UPDATE patient
print_info "Test 7: UPDATE patient"
(
    echo "UPDATE 1 \"John Updated\" john.new@test.com 555-9999 1990-05-15"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -20
print_success "UPDATE command executed"
echo ""

# Test 8: DELETE patient
print_info "Test 8: DELETE patient"
(
    echo "DELETE 2"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -10
print_success "DELETE command executed"
echo ""

# Test 9: Final COUNT
print_info "Test 9: Final COUNT after deletion"
(
    echo "COUNT"
    sleep 0.5
    echo "EXIT"
) | timeout 3 java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient localhost $TEST_PORT 2>/dev/null | head -10
print_success "COUNT command executed"
echo ""

echo ""
print_success "All tests completed!"
print_info "Server will stop automatically"
