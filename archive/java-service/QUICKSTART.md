# Quick Start Guide - Patient Records TCP Server

## Setup

```bash
# Build project (creates JAR)
mvn clean package
```

## Running the Server

### Option 1: Simple Start
```bash
./start-server.sh
```

### Option 2: Custom Port
```bash
./start-server.sh 8888
```

Output:
```
🚀 Starting Patient Records Socket Server...
   Port: 9999
   JAR: target/patient-records-java-service-1.0.0.jar

To connect, run in another terminal:
  ./client.sh localhost 9999

Press Ctrl+C to stop server
```

## Connecting a Client

### In a new terminal:

```bash
./client.sh localhost 9999
```

Output:
```
🔗 Connecting to Patient Records Server...
   Host: localhost
   Port: 9999

✓ Connected to localhost:9999
Type 'HELP' for available commands or 'EXIT' to quit

>
```

## Interactive Commands

Once connected, type commands:

```
> CREATE "John Doe" john@hospital.com 555-1234 1990-05-15
✓ Patient created:
  ID: 1
  Name: John Doe
  Email: john@hospital.com

> LIST
✓ Found 1 patient(s):
  Patient #1:
    ID: 1
    Name: John Doe
    Email: john@hospital.com
    Phone: 555-1234
    Birth Date: 1990-05-15
    Age: 34

> COUNT
✓ Count: 1

> GET 1
✓ Found 1 patient(s):
  Patient #1:
    ...

> UPDATE 1 "Jane Doe" jane@hospital.com 555-9999 1990-05-15
✓ Patient updated

> SEARCH Jane
✓ Found 1 patient(s):
  ...

> DELETE 1
✓ Patient deleted

> EXIT
✓ Disconnected
Goodbye!
```

## Automated Interactive Test

Run all tests automatically (server starts, runs commands, stops):

```bash
./test-interactive.sh
```

Output:
```
➜ Patient Records - TCP Client-Server Test

➜ Building project...
✓ Build successful

➜ Starting server on port 9996...
✓ Server started (PID: 60278)

➜ Running interactive tests...

ℹ Test 1: CREATE patient
✓ CREATE command executed

ℹ Test 2: CREATE second patient
✓ CREATE command executed

ℹ Test 3: LIST all patients
✓ LIST command executed

ℹ Test 4: SEARCH by name
✓ SEARCH command executed

ℹ Test 5: COUNT total patients
✓ COUNT command executed

ℹ Test 6: GET patient by ID
✓ GET patient executed

ℹ Test 7: UPDATE patient
✓ UPDATE command executed

ℹ Test 8: DELETE patient
✓ DELETE command executed

ℹ Test 9: Final COUNT after deletion
✓ COUNT command executed

✓ All tests completed!
ℹ Server will stop automatically
```

## Running Unit Tests

```bash
mvn clean test
```

Results:
- PatientService: 27 tests ✅
- SocketServer: 13 tests ✅
- SocketClient: 11 tests ✅
- **Total: 51 tests, all passing**

## Workflow Example

### Terminal 1 (Server)
```bash
$ ./start-server.sh
🚀 Starting Patient Records Socket Server...
   Port: 9999
   
Press Ctrl+C to stop server
---
Socket Server started on port 9999 (using Virtual Threads)
```

### Terminal 2 (Client)
```bash
$ ./client.sh
✓ Connected to localhost:9999
Type 'HELP' for available commands or 'EXIT' to quit

> CREATE "Alice Wonder" alice@test.com 555-1111 1990-06-15
✓ Patient created:
  ID: 1
  Name: Alice Wonder
  Email: alice@test.com

> CREATE "Bob Smith" bob@test.com 555-2222 1992-03-20
✓ Patient created:
  ID: 2
  Name: Bob Smith
  Email: bob@test.com

> LIST
✓ Found 2 patient(s):
  Patient #1:
    ID: 1
    Name: Alice Wonder
    Email: alice@test.com
    Phone: 555-1111
    Birth Date: 1990-06-15
    Age: 34

  Patient #2:
    ID: 2
    Name: Bob Smith
    Email: bob@test.com
    Phone: 555-2222
    Birth Date: 1992-03-20
    Age: 32

> SEARCH Alice
✓ Found 1 patient(s):
  Patient #1:
    ID: 1
    Name: Alice Wonder
    Email: alice@test.com
    Phone: 555-1111
    Birth Date: 1990-06-15
    Age: 34

> EXIT
✓ Disconnected
Goodbye!
```

### Terminal 1 (Server) - Logs
```
Socket Server started on port 9999 (using Virtual Threads)
```

## File Structure

```
java-service/
├── start-server.sh          # Start TCP server
├── client.sh                # Start TCP client
├── test-interactive.sh      # Run automated tests
├── TCP_CLIENT_SERVER.md     # Detailed protocol documentation
├── src/main/java/.../
│   ├── Patient.java         # Entity class
│   ├── PatientService.java  # Business logic
│   ├── PatientRepository.java # Data access interface
│   ├── InMemoryPatientRepository.java # In-memory DB
│   ├── SQLitePatientRepository.java # Optional SQLite DB
│   ├── SocketServer.java    # TCP server (Virtual Threads)
│   └── SocketClient.java    # TCP client (Interactive CLI)
├── src/test/java/.../
│   ├── PatientServiceTest.java # 27 tests
│   ├── SocketServerTest.java   # 13 tests
│   └── SocketClientTest.java   # 11 tests
└── pom.xml                  # Maven configuration
```

## Technology Stack

- **Java 25** - Latest JDK features
- **Virtual Threads** - High-concurrency async I/O
- **TCP Protocol** - Custom text-based messaging
- **JUnit 5** - Modern testing framework
- **Maven** - Build automation

## Key Features

✅ **Ultra-Low Latency** - Persistent TCP connections  
✅ **High Concurrency** - Thousands of concurrent clients with Virtual Threads  
✅ **Simple Protocol** - Pipe-delimited text format (no HTTP overhead)  
✅ **Interactive CLI** - User-friendly command interface  
✅ **Comprehensive Tests** - 51 unit tests, all passing  
✅ **Production-Ready** - Error handling, validation, thread-safe operations  

## Troubleshooting

### "Address already in use"
Server already running on that port. Either:
- Use a different port: `./start-server.sh 8888`
- Kill the process: `lsof -i :9999 | grep java | awk '{print $2}' | xargs kill`

### "Connection refused"
Server not running. Make sure to start it in another terminal:
```bash
./start-server.sh
```

### "JAR file not found"
Need to build first:
```bash
mvn clean package
```

## Next Steps

1. **Understand the Protocol** - See `TCP_CLIENT_SERVER.md`
2. **Run the Tests** - `mvn clean test`
3. **Try It Live** - `./start-server.sh` then `./client.sh`
4. **Explore the Code** - Check `SocketServer.java` and `SocketClient.java`
