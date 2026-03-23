# Java MCP Service

Healthcare data processing and patient management service built with Java.

## Overview

This service provides Model Context Protocol (MCP) servers for:
- Patient Data Management
- Insurance Coverage & Claims
- Medication Information
- Healthcare Tool Orchestration

## Technology Stack

- **Java 25**
- **Framework**: Spring Boot 3.x (planned)
- **Database**: PostgreSQL 16
- **Build Tool**: Maven 3.9
- **HTTP Server**: Embedded Tomcat

## Project Structure

```
java-service/
├── pom.xml
├── Dockerfile
├── README.md (this file)
└── src/
    └── main/java/com/healthcare/java/service/
        ├── JavaMCPServiceApp.java
        ├── mcp/
        │   ├── PatientDataMCPServer.java
        │   ├── InsuranceMCPServer.java
        │   ├── MedicationMCPServer.java
        │   └── MCPServerManager.java
        ├── service/
        │   ├── PatientDataService.java
        │   ├── InsuranceService.java
        │   └── MedicationService.java
        ├── model/
        │   ├── Patient.java
        │   ├── PatientHistory.java
        │   └── MedicationRecord.java
        └── config/
            └── DatabaseConfig.java
```

## Development

### Build
```bash
mvn clean install
```

### Run
```bash
mvn spring-boot:run
```

### Test
```bash
mvn test
```

## API Endpoints

- `GET /health` - Service health check
- `GET /info` - Service information
- `POST /api/patients` - Create patient record
- `GET /api/patients/{id}` - Get patient details
- `GET /api/patients/{id}/history` - Get patient history

## Configuration

### Environment Variables
```
SERVICE_NAME=java-service
DB_HOST=localhost
DB_PORT=5432
DB_USER=patient_user
DB_PASSWORD=patient_password
DB_NAME=patient_records
JAVA_OPTS=-Xmx512m
```

## Docker

### Build Image
```bash
docker build -t patient-records-java-service .
```

### Run Container
```bash
docker run -p 8080:8080 \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  patient-records-java-service
```

## Dependencies

Key dependencies:
- SLF4J + Logback (Logging)
- Gson (JSON Processing)
- Apache HttpClient (HTTP calls)
- JUnit 5 (Testing)

See `pom.xml` for complete list.

## Contributing

1. Follow Java naming conventions
2. Use SLF4J for logging
3. Write unit tests for all service methods
4. Update documentation when adding features

## Testing

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=PatientDataServiceTest

# Run with coverage
mvn test jacoco:report
```
