package com.healthcare.java.patient;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

import java.io.*;
import java.net.*;

/**
 * Tests for SocketClient
 * Verifies client-server communication
 */
@DisplayName("Socket Client Tests")
public class SocketClientTest {
    private SocketServer server;
    private SocketClient client;
    private Thread serverThread;
    private static final int TEST_PORT = 9997;

    @BeforeEach
    public void setUp() throws IOException {
        PatientRepository repository = new InMemoryPatientRepository();
        PatientService service = new PatientService(repository);
        server = new SocketServer(service, TEST_PORT);

        // Start server in background
        serverThread = new Thread(() -> {
            try {
                server.start();
            } catch (IOException e) {
                fail("Server startup failed: " + e.getMessage());
            }
        });
        serverThread.setDaemon(true);
        serverThread.start();

        // Wait for server to start
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Create and connect client
        client = new SocketClient("localhost", TEST_PORT);
        client.connect();
    }

    @AfterEach
    public void cleanup() throws IOException {
        client.disconnect();
        server.stop();
        try {
            serverThread.join(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Test
    @DisplayName("Should connect to server")
    public void testConnection() {
        assertNotNull(client, "Client should be created");
        // Connection verified in setUp - no exception thrown
    }

    @Test
    @DisplayName("Should create patient via client")
    public void testCreatePatient() throws IOException {
        String response = client.sendCommand("CREATE|Alice|alice@test.com|555-1111|1990-01-01");
        
        assertTrue(response.startsWith("SUCCESS|"), "Should return success");
        assertTrue(response.contains("Alice"), "Should contain patient name");
    }

    @Test
    @DisplayName("Should get patient by ID")
    public void testGetPatient() throws IOException {
        // Create first
        String createResp = client.sendCommand("CREATE|Bob|bob@test.com|555-2222|1991-02-02");
        String[] parts = createResp.split("\\|");
        String patientId = parts[1];

        // Get patient
        String getResp = client.sendCommand("GET|" + patientId);
        
        assertTrue(getResp.startsWith("SUCCESS|"), "Should return success");
        assertTrue(getResp.contains("Bob"), "Should contain patient name");
    }

    @Test
    @DisplayName("Should list all patients")
    public void testListPatients() throws IOException {
        // Create two patients
        client.sendCommand("CREATE|Patient1|p1@test.com|555-1111|1990-01-01");
        client.sendCommand("CREATE|Patient2|p2@test.com|555-2222|1991-02-02");

        String response = client.sendCommand("LIST");
        
        assertTrue(response.startsWith("SUCCESS|2"), "Should return 2 patients");
    }

    @Test
    @DisplayName("Should search patients by name")
    public void testSearchPatients() throws IOException {
        client.sendCommand("CREATE|Charlie Wonder|charlie@test.com|555-3333|1992-03-03");
        client.sendCommand("CREATE|David Wonder|david@test.com|555-4444|1993-04-04");

        String response = client.sendCommand("SEARCH|Wonder");
        
        assertTrue(response.startsWith("SUCCESS|2"), "Should find 2 matches");
    }

    @Test
    @DisplayName("Should count total patients")
    public void testCountPatients() throws IOException {
        client.sendCommand("CREATE|P1|p1@test.com|555-1111|1990-01-01");
        client.sendCommand("CREATE|P2|p2@test.com|555-2222|1991-02-02");
        client.sendCommand("CREATE|P3|p3@test.com|555-3333|1992-03-03");

        String response = client.sendCommand("COUNT");
        
        assertTrue(response.startsWith("SUCCESS|3"), "Should return count 3");
    }

    @Test
    @DisplayName("Should update patient")
    public void testUpdatePatient() throws IOException {
        // Create
        String createResp = client.sendCommand("CREATE|Original|orig@test.com|555-0000|1990-01-01");
        String[] parts = createResp.split("\\|");
        String patientId = parts[1];

        // Update
        String updateResp = client.sendCommand("UPDATE|" + patientId + "|Updated|updated@test.com|555-9999|1990-01-01");
        
        assertTrue(updateResp.startsWith("SUCCESS|"), "Update should succeed");
        assertTrue(updateResp.contains("updated@test.com"), "Should reflect new email");
    }

    @Test
    @DisplayName("Should delete patient")
    public void testDeletePatient() throws IOException {
        // Create
        String createResp = client.sendCommand("CREATE|ToDelete|delete@test.com|555-0000|1990-01-01");
        String[] parts = createResp.split("\\|");
        String patientId = parts[1];

        // Delete
        String deleteResp = client.sendCommand("DELETE|" + patientId);
        assertTrue(deleteResp.startsWith("SUCCESS|"), "Delete should succeed");

        // Verify deleted
        String getResp = client.sendCommand("GET|" + patientId);
        assertTrue(getResp.startsWith("ERROR|"), "Patient should not exist");
    }

    @Test
    @DisplayName("Should handle invalid commands")
    public void testInvalidCommand() throws IOException {
        String response = client.sendCommand("INVALID_COMMAND");
        
        assertTrue(response.startsWith("ERROR|"), "Should return error");
    }

    @Test
    @DisplayName("Should handle multiple sequential operations")
    public void testSequentialOperations() throws IOException {
        // Create
        String create1 = client.sendCommand("CREATE|User1|user1@test.com|555-1111|1990-01-01");
        assertTrue(create1.startsWith("SUCCESS|"));

        // Create another
        String create2 = client.sendCommand("CREATE|User2|user2@test.com|555-2222|1991-02-02");
        assertTrue(create2.startsWith("SUCCESS|"));

        // List
        String list = client.sendCommand("LIST");
        assertTrue(list.startsWith("SUCCESS|2"));

        // Count
        String count = client.sendCommand("COUNT");
        assertTrue(count.startsWith("SUCCESS|2"));

        // Search
        String search = client.sendCommand("SEARCH|User");
        assertTrue(search.startsWith("SUCCESS|2"));
    }

    @Test
    @DisplayName("Should handle concurrent client connections")
    public void testConcurrentClients() throws IOException, InterruptedException {
        Thread[] clientThreads = new Thread[3];

        for (int i = 0; i < 3; i++) {
            final int index = i;
            clientThreads[i] = Thread.ofVirtual().start(() -> {
                try {
                    SocketClient tempClient = new SocketClient("localhost", TEST_PORT);
                    tempClient.connect();

                    String createResp = tempClient.sendCommand("CREATE|Client" + index + "|c" + index + "@test.com|555-000" + index + "|1990-01-01");
                    assertTrue(createResp.startsWith("SUCCESS|"), "Create should succeed for client " + index);

                    String countResp = tempClient.sendCommand("COUNT");
                    assertTrue(countResp.startsWith("SUCCESS|"), "Count should succeed for client " + index);

                    tempClient.disconnect();
                } catch (IOException e) {
                    fail("Client operation failed: " + e.getMessage());
                }
            });
        }

        for (Thread t : clientThreads) {
            t.join();
        }
    }
}
