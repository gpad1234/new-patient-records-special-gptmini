# TCP Client-Server Architecture

## Overview
High-performance patient records system using Java Virtual Threads (Project Loom) for TCP networking.

## Architecture

```
┌─────────────────┐         TCP Protocol          ┌──────────────────┐
│  SocketClient   │ ◄──────────────────────────► │  SocketServer    │
│  (Interactive   │   (Port 9999 by default)     │  (PatientService)│
│   CLI)          │                               │  (In-Memory DB)  │
└─────────────────┘                               └──────────────────┘
     Commands:                                          Response:
     ├─ CREATE                                         ├─ SUCCESS|data
     ├─ GET                                            └─ ERROR|message
     ├─ UPDATE
     ├─ DELETE
     ├─ LIST
     ├─ SEARCH
     └─ COUNT
```

## Running the Server

```bash
# Compile
mvn clean package

# Run server (listens on port 9999)
java -cp target/patient-records-java-service-1.0.0.jar \
  com.healthcare.java.patient.SocketServer

# Or customize port
java -cp target/patient-records-java-service-1.0.0.jar \
  com.healthcare.java.patient.SocketServer 8888
```

## Running the Client

```bash
# Default (localhost:9999)
java -cp target/patient-records-java-service-1.0.0.jar \
  com.healthcare.java.patient.SocketClient

# Custom host/port
java -cp target/patient-records-java-service-1.0.0.jar \
  com.healthcare.java.patient.SocketClient 192.168.1.100 9999
```

## Interactive Commands

### CREATE - Add new patient
```
> CREATE "John Doe" john@example.com 555-1234 1990-05-15
✓ Patient created:
  ID: 1
  Name: John Doe
  Email: john@example.com
```

### GET - Retrieve patient by ID
```
> GET 1
✓ Found 1 patient(s):
  Patient #1:
    ID: 1
    Name: John Doe
    Email: john@example.com
    Phone: 555-1234
    Birth Date: 1990-05-15
    Age: 34
```

### UPDATE - Modify patient
```
> UPDATE 1 "Jane Doe" jane@example.com 555-9999 1990-05-15
✓ Patient updated
```

### DELETE - Remove patient
```
> DELETE 1
✓ Patient deleted
```

### LIST - Show all patients
```
> LIST
✓ Found 2 patient(s):
  Patient #1:
    ID: 1
    Name: Alice Smith
    ...
  Patient #2:
    ID: 2
    Name: Bob Jones
    ...
```

### SEARCH - Find by name
```
> SEARCH John
✓ Found 2 patient(s):
  Patient #1:
    ID: 1
    Name: John Doe
    ...
  Patient #2:
    ID: 3
    Name: John Smith
    ...
```

### COUNT - Total patients
```
> COUNT
✓ Count: 5
```

### HELP - Show all commands
```
> HELP
Available Commands:
...
```

### EXIT - Close connection
```
> EXIT
✓ Disconnected
Goodbye!
```

## Protocol Details

### Request Format
```
OPERATION|param1|param2|...
```

### Response Format
```
SUCCESS|data1|data2|...    (Success response)
ERROR|error message         (Error response)
```

### Examples

**CREATE Request/Response:**
```
REQUEST:  CREATE|John|john@test.com|555-0123|1990-05-15
RESPONSE: SUCCESS|1|John|john@test.com
```

**GET Request/Response:**
```
REQUEST:  GET|1
RESPONSE: SUCCESS|1:John:john@test.com:555-0123:1990-05-15:34
```

**LIST Request/Response:**
```
REQUEST:  LIST
RESPONSE: SUCCESS|2|1:John:john@test.com:555-0123:1990-05-15:34|2:Jane:jane@test.com:555-5678:1992-03-20:32
```

## Test Coverage

- **PatientService Tests**: 27 tests ✅
- **SocketServer Tests**: 13 tests ✅
- **SocketClient Tests**: 11 tests ✅
- **Total**: 51 tests, all passing ✅

## Performance

- **Concurrency**: Thousands of concurrent connections (Virtual Threads)
- **Latency**: Sub-millisecond response times
- **Memory**: Lightweight (virtual threads use ~1KB each)
- **Connection Type**: Persistent TCP socket (no reconnection overhead)

## Key Features

✅ **Virtual Threads**: Handle thousands of concurrent clients efficiently  
✅ **TCP Protocol**: Low-overhead, persistent connections  
✅ **Stateful**: Client maintains connection for multiple operations  
✅ **Text-Based**: Simple, human-readable protocol  
✅ **Error Handling**: Comprehensive error messages  
✅ **Interactive CLI**: User-friendly command interface  
✅ **Thread-Safe**: All operations are concurrent-safe  

## Architecture vs HTTP

| Aspect | TCP (Our Design) | HTTP |
|--------|------------------|------|
| Connection | Persistent | Stateless |
| Protocol | Custom text-based | Standard HTTP/REST |
| Port | 9999 (configurable) | 80/443 |
| Overhead | Minimal | Headers + body |
| Latency | Ultra-low | Higher |
| Use Case | Real-time systems | Web services |

## Example Session

```bash
$ java -cp target/patient-records-java-service-1.0.0.jar \
  com.healthcare.java.patient.SocketClient
✓ Connected to localhost:9999
Type 'HELP' for available commands or 'EXIT' to quit

> CREATE "Alice Wonder" alice@hospital.com 555-1111 1985-06-15
✓ Patient created:
  ID: 1
  Name: Alice Wonder
  Email: alice@hospital.com

> CREATE "Bob Smith" bob@hospital.com 555-2222 1980-03-20
✓ Patient created:
  ID: 2
  Name: Bob Smith
  Email: bob@hospital.com

> LIST
✓ Found 2 patient(s):
  Patient #1:
    ID: 1
    Name: Alice Wonder
    Email: alice@hospital.com
    Phone: 555-1111
    Birth Date: 1985-06-15
    Age: 39

  Patient #2:
    ID: 2
    Name: Bob Smith
    Email: bob@hospital.com
    Phone: 555-2222
    Birth Date: 1980-03-20
    Age: 44

> SEARCH Alice
✓ Found 1 patient(s):
  Patient #1:
    ID: 1
    Name: Alice Wonder
    ...

> UPDATE 1 "Alice Wonder" alice.new@hospital.com 555-9999 1985-06-15
✓ Patient updated

> GET 1
✓ Found 1 patient(s):
  Patient #1:
    ID: 1
    Name: Alice Wonder
    Email: alice.new@hospital.com
    Phone: 555-9999
    Birth Date: 1985-06-15
    Age: 39

> COUNT
✓ Count: 2

> DELETE 2
✓ Patient deleted

> COUNT
✓ Count: 1

> EXIT
✓ Disconnected
Goodbye!
```

## Debugging

Enable verbose output:
```bash
# Server with debug
java -Xmx256m -cp ... SocketServer

# Monitor connections (macOS)
lsof -i :9999
```

## Future Enhancements

- [ ] Authentication/Authorization
- [ ] Encryption (TLS/SSL)
- [ ] Connection pooling
- [ ] Caching layer
- [ ] Persistence to SQLite
- [ ] Monitoring/Metrics
