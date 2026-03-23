#!/bin/bash

# TCP Socket Client for Patient Records
# Usage: ./client.sh [host] [port]

HOST=${1:-localhost}
PORT=${2:-9999}
JAR_FILE="target/patient-records-java-service-1.0.0.jar"

# Check if JAR exists
if [ ! -f "$JAR_FILE" ]; then
    echo "❌ JAR file not found: $JAR_FILE"
    echo "Run 'mvn clean package' first"
    exit 1
fi

echo "🔗 Connecting to Patient Records Server..."
echo "   Host: $HOST"
echo "   Port: $PORT"
echo ""

java -cp "$JAR_FILE" com.healthcare.java.patient.SocketClient $HOST $PORT
