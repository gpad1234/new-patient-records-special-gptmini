#!/bin/bash

# Start TCP Socket Server for Patient Records
# Usage: ./start-server.sh [port]

PORT=${1:-9999}
JAR_FILE="target/patient-records-java-service-1.0.0.jar"

# Check if JAR exists
if [ ! -f "$JAR_FILE" ]; then
    echo "❌ JAR file not found: $JAR_FILE"
    echo "Run 'mvn clean package' first"
    exit 1
fi

echo "🚀 Starting Patient Records Socket Server..."
echo "   Port: $PORT"
echo "   JAR: $JAR_FILE"
echo ""
echo "To connect, run in another terminal:"
echo "  ./client.sh localhost $PORT"
echo ""
echo "Press Ctrl+C to stop server"
echo "---"

java -cp "$JAR_FILE" com.healthcare.java.patient.SocketServer $PORT
