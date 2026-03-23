#!/bin/bash
# Start Java MCP Service
# Usage: ./scripts/start-java-service.sh

echo "☕ Starting Java MCP Service..."

SERVICE_DIR="services/java-service"

if [ ! -d "$SERVICE_DIR" ]; then
    echo "❌ Java service directory not found at $SERVICE_DIR"
    exit 1
fi

# Check Java installation
if ! command -v java &> /dev/null; then
    echo "❌ Java not installed. See LOCAL_SETUP.md for installation instructions"
    exit 1
fi

# Check Maven installation
if ! command -v mvn &> /dev/null; then
    echo "❌ Maven not installed. See LOCAL_SETUP.md for installation instructions"
    exit 1
fi

cd "$SERVICE_DIR"

echo "📦 Building Java service..."
mvn clean install

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo "🚀 Starting Socket Server on port 9999..."
java -cp target/patient-records-java-service-1.0.0.jar:target/lib/* com.healthcare.java.patient.SocketServer
