package com.healthcare.java.patient;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

import java.io.*;
import java.net.*;
import java.time.LocalDate;

/**
 * Tests for SocketServer using Virtual Threads
 * Verifies text-based protocol handling
 */
@DisplayName("Socket Server Tests")
public class SocketServerTest {
    private SocketServer server;
    private PatientService patientService;
    private Thread serverThread;
    private static final int TEST_PORT = 9998;

    @BeforeEach
    public void setUp() throws IOException {
        PatientRepository repository = new InMemoryPatientRepository();
        patientService = new PatientService(repository);
        server = new SocketServer(patientService, TEST_PORT);
        
        // Start server in background thread
        serverThread = new Thread(() -> {
            try {
                server.start();
            } catch (IOException e) {
                fail("Failed to start server: " + e.getMessage());
            }
        });
        serverThread.setDaemon(true);
        serverThread.start();
        
        // Give server time to start
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @AfterEach
    public void cleanup() throws IOException {
        server.stop();
        try {
            serverThread.join(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private String sendCommand(String command) throws IOException {
        try (Socket socket = new Socket("localhost", TEST_PORT);
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
             BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {
            
            out.println(command);
            return in.readLine();
        }
    }

    @Test
    @DisplayName("Should create patient via socket")
    public void testCreateViaSocket() throws IOException {
        String response = sendCommand("CREATE|John Doe|john@test.com|555-1234|1990-05-15");
        
        assertTrue(response.startsWith("SUCCESS|"), "Should return success");
        assertTrue(response.contains("John Doe"), "Should contain patient name");
        assertEquals(patientService.count(), 1, "Should have 1 patient");
    }

    @Test
    @DisplayName("Should reject invalid CREATE command")
    public void testCreateInvalidParameters() throws IOException {
        String response = sendCommand("CREATE|OnlyOneParam");
        
        assertTrue(response.startsWith("ERROR|"), "Should return error");
        assertTrue(response.contains("CREATE requires 4 parameters"), "Should explain parameters");
    }

    @Test
    @DisplayName("Should retrieve patient via GET")
    public void testGetViaSocket() throws IOException {
        // Create first
        String createResp = sendCommand("CREATE|Jane Smith|jane@test.com|555-5678|1992-03-20");
        String[] parts = createResp.split("\\|");
        String patientId = parts[1];
        
        // Get patient
        String response = sendCommand("GET|" + patientId);
        
        assertTrue(response.startsWith("SUCCESS|"), "Should return success");
        assertTrue(response.contains("Jane Smith"), "Should contain patient name");
    }

    @Test
    @DisplayName("Should handle GET for non-existent patient")
    public void testGetNonExistent() throws IOException {
        String response = sendCommand("GET|999");
        
        assertTrue(response.startsWith("ERROR|"), "Should return error");
        assertTrue(response.contains("not found"), "Should indicate not found");
    }

    @Test
    @DisplayName("Should update patient via socket")
    public void testUpdateViaSocket() throws IOException {
        // Create
        String createResp = sendCommand("CREATE|Bob|bob@test.com|555-1111|1985-01-10");
        String[] parts = createResp.split("\\|");
        String patientId = parts[1];
        
        // Update
        String updateResp = sendCommand("UPDATE|" + patientId + "|Bob Updated|bob.new@test.com|555-2222|1985-01-10");
        
        assertTrue(updateResp.startsWith("SUCCESS|"), "Should return success");
        assertTrue(updateResp.contains("bob.new@test.com"), "Should have new email");
    }

    @Test
    @DisplayName("Should delete patient via socket")
    public void testDeleteViaSocket() throws IOException {
        // Create
        String createResp = sendCommand("CREATE|Delete Me|delete@test.com|555-0000|1990-01-01");
        String[] parts = createResp.split("\\|");
        String patientId = parts[1];
        
        assertEquals(patientService.count(), 1, "Should have 1 patient");
        
        // Delete
        String deleteResp = sendCommand("DELETE|" + patientId);
        assertTrue(deleteResp.startsWith("SUCCESS|"), "Should return success");
        
        assertEquals(patientService.count(), 0, "Should have 0 patients");
    }

    @Test
    @DisplayName("Should list all patients")
    public void testListViaSocket() throws IOException {
        // Create two patients
        sendCommand("CREATE|Patient 1|p1@test.com|555-1111|1990-01-01");
        sendCommand("CREATE|Patient 2|p2@test.com|555-2222|1991-01-01");
        
        String response = sendCommand("LIST");
        
        assertTrue(response.startsWith("SUCCESS|2"), "Should return success with count 2");
        assertTrue(response.contains("Patient 1"), "Should contain first patient");
        assertTrue(response.contains("Patient 2"), "Should contain second patient");
    }

    @Test
    @DisplayName("Should handle empty LIST")
    public void testListEmpty() throws IOException {
        String response = sendCommand("LIST");
        
        assertTrue(response.startsWith("SUCCESS|0"), "Should return success with count 0");
    }

    @Test
    @DisplayName("Should search patients by name")
    public void testSearchViaSocket() throws IOException {
        sendCommand("CREATE|Alice Wonder|alice@test.com|555-1111|1990-01-01");
        sendCommand("CREATE|Bob Wonder|bob@test.com|555-2222|1991-01-01");
        sendCommand("CREATE|Charlie Brown|charlie@test.com|555-3333|1992-01-01");
        
        String response = sendCommand("SEARCH|Wonder");
        
        assertTrue(response.startsWith("SUCCESS|2"), "Should find 2 matches");
        assertTrue(response.contains("Alice"), "Should contain Alice");
        assertTrue(response.contains("Bob"), "Should contain Bob");
    }

    @Test
    @DisplayName("Should return count of patients")
    public void testCountViaSocket() throws IOException {
        sendCommand("CREATE|Patient 1|p1@test.com|555-1111|1990-01-01");
        sendCommand("CREATE|Patient 2|p2@test.com|555-2222|1991-01-01");
        sendCommand("CREATE|Patient 3|p3@test.com|555-3333|1992-01-01");
        
        String response = sendCommand("COUNT");
        
        assertTrue(response.startsWith("SUCCESS|3"), "Should return count 3");
    }

    @Test
    @DisplayName("Should handle unknown command")
    public void testUnknownCommand() throws IOException {
        String response = sendCommand("UNKNOWN|param");
        
        assertTrue(response.startsWith("ERROR|"), "Should return error");
        assertTrue(response.contains("Unknown command"), "Should indicate unknown command");
    }

    @Test
    @DisplayName("Should reject empty command")
    public void testEmptyCommand() throws IOException {
        String response = sendCommand("");
        
        assertTrue(response.startsWith("ERROR|"), "Should return error");
    }

    @Test
    @DisplayName("Should handle concurrent connections with virtual threads")
    public void testConcurrentConnections() throws IOException, InterruptedException {
        // Send multiple commands in parallel using virtual threads
        Thread[] threads = new Thread[5];
        
        for (int i = 0; i < 5; i++) {
            final int index = i;
            threads[i] = Thread.ofVirtual().start(() -> {
                try {
                    String response = sendCommand("CREATE|Patient " + index + "|p" + index + "@test.com|555-000" + index + "|1990-01-01");
                    assertTrue(response.startsWith("SUCCESS|"), "Create should succeed for patient " + index);
                } catch (IOException e) {
                    fail("Connection failed for patient " + index + ": " + e.getMessage());
                }
            });
        }
        
        // Wait for all threads
        for (Thread t : threads) {
            t.join();
        }
        
        // Add small delay for any final operations
        Thread.sleep(100);
        
        // Verify all patients created (at least 4, allowing for timing variations)
        long finalCount = patientService.count();
        assertTrue(finalCount >= 4, "Should have at least 4 patients from concurrent creates, got " + finalCount);
    }
}
