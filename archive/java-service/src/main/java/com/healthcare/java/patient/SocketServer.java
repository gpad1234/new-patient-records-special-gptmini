package com.healthcare.java.patient;

import java.io.*;
import java.net.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * High-concurrency Socket Server using Virtual Threads (Project Loom)
 * Simple text-based protocol for Patient CRUD operations
 * 
 * Protocol Examples:
 *   CREATE|name|email|phone|birthDate(yyyy-MM-dd)
 *   GET|id
 *   UPDATE|id|name|email|phone|birthDate
 *   DELETE|id
 *   LIST
 *   SEARCH|name
 */
public class SocketServer {
    private final PatientService patientService;
    private final int port;
    private ServerSocket serverSocket;
    private volatile boolean running = false;
    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public SocketServer(PatientService patientService, int port) {
        this.patientService = patientService;
        this.port = port;
    }

    /**
     * Start the server - listens for connections and spawns virtual threads
     */
    public void start() throws IOException {
        serverSocket = new ServerSocket(port);
        running = true;
        System.out.println("Socket Server started on port " + port + " (using Virtual Threads)");

        // Accept connections in a loop, spawning virtual threads for each
        while (running) {
            Socket clientSocket = serverSocket.accept();
            // Virtual thread handles each connection
            Thread.ofVirtual().start(() -> handleClient(clientSocket));
        }
    }

    /**
     * Stop the server
     */
    public void stop() throws IOException {
        running = false;
        if (serverSocket != null && !serverSocket.isClosed()) {
            serverSocket.close();
        }
    }

    /**
     * Handle individual client connection
     */
    private void handleClient(Socket clientSocket) {
        try (
            BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
            PrintWriter out = new PrintWriter(clientSocket.getOutputStream(), true)
        ) {
            String command;
            while ((command = in.readLine()) != null && running) {
                String response = processCommand(command);
                out.println(response);
            }
        } catch (IOException e) {
            System.err.println("Client connection error: " + e.getMessage());
        }
    }

    /**
     * Process client commands
     * Returns response string (SUCCESS|data or ERROR|message)
     */
    private String processCommand(String command) {
        try {
            if (command == null || command.trim().isEmpty()) {
                return "ERROR|Empty command";
            }

            String[] parts = command.split("\\|");
            String operation = parts[0].toUpperCase();

            return switch (operation) {
                case "CREATE" -> handleCreate(parts);
                case "GET" -> handleGet(parts);
                case "UPDATE" -> handleUpdate(parts);
                case "DELETE" -> handleDelete(parts);
                case "LIST" -> handleList();
                case "SEARCH" -> handleSearch(parts);
                case "COUNT" -> handleCount();
                default -> "ERROR|Unknown command: " + operation;
            };
        } catch (Exception e) {
            return "ERROR|" + e.getMessage();
        }
    }

    /**
     * CREATE|name|email|phone|birthDate(yyyy-MM-dd)
     */
    private String handleCreate(String[] parts) {
        if (parts.length != 5) {
            return "ERROR|CREATE requires 4 parameters: name|email|phone|birthDate";
        }

        try {
            Patient patient = Patient.builder()
                    .name(parts[1])
                    .email(parts[2])
                    .phone(parts[3])
                    .birthDate(LocalDate.parse(parts[4], dateFormatter))
                    .build();

            Patient created = patientService.create(patient);
            return "SUCCESS|" + created.getId() + "|" + created.getName() + "|" + created.getEmail();
        } catch (IllegalArgumentException e) {
            return "ERROR|" + e.getMessage();
        } catch (java.time.format.DateTimeParseException e) {
            return "ERROR|Invalid date format. Use yyyy-MM-dd";
        }
    }

    /**
     * GET|id
     */
    private String handleGet(String[] parts) {
        if (parts.length != 2) {
            return "ERROR|GET requires 1 parameter: id";
        }

        try {
            long id = Long.parseLong(parts[1]);
            Patient patient = patientService.getById(id);
            return "SUCCESS|" + formatPatient(patient);
        } catch (NoSuchElementException e) {
            return "ERROR|Patient not found";
        } catch (NumberFormatException e) {
            return "ERROR|Invalid ID format";
        }
    }

    /**
     * UPDATE|id|name|email|phone|birthDate
     */
    private String handleUpdate(String[] parts) {
        if (parts.length != 6) {
            return "ERROR|UPDATE requires 5 parameters: id|name|email|phone|birthDate";
        }

        try {
            long id = Long.parseLong(parts[1]);
            Patient updated = Patient.builder()
                    .name(parts[2])
                    .email(parts[3])
                    .phone(parts[4])
                    .birthDate(LocalDate.parse(parts[5], dateFormatter))
                    .build();

            patientService.update(id, updated);
            Patient result = patientService.getById(id);
            return "SUCCESS|" + formatPatient(result);
        } catch (NoSuchElementException e) {
            return "ERROR|Patient not found";
        } catch (NumberFormatException e) {
            return "ERROR|Invalid ID format";
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException e) {
            return "ERROR|" + e.getMessage();
        }
    }

    /**
     * DELETE|id
     */
    private String handleDelete(String[] parts) {
        if (parts.length != 2) {
            return "ERROR|DELETE requires 1 parameter: id";
        }

        try {
            long id = Long.parseLong(parts[1]);
            patientService.delete(id);
            return "SUCCESS|Patient deleted";
        } catch (NoSuchElementException e) {
            return "ERROR|Patient not found";
        } catch (NumberFormatException e) {
            return "ERROR|Invalid ID format";
        }
    }

    /**
     * LIST - returns all patients
     */
    private String handleList() {
        try {
            List<Patient> patients = patientService.getAll();
            if (patients.isEmpty()) {
                return "SUCCESS|0|No patients";
            }

            StringBuilder sb = new StringBuilder("SUCCESS|").append(patients.size());
            for (Patient p : patients) {
                sb.append("|").append(formatPatient(p));
            }
            return sb.toString();
        } catch (Exception e) {
            return "ERROR|" + e.getMessage();
        }
    }

    /**
     * SEARCH|name
     */
    private String handleSearch(String[] parts) {
        if (parts.length != 2) {
            return "ERROR|SEARCH requires 1 parameter: name";
        }

        try {
            List<Patient> results = patientService.findByName(parts[1]);
            if (results.isEmpty()) {
                return "SUCCESS|0|No results";
            }

            StringBuilder sb = new StringBuilder("SUCCESS|").append(results.size());
            for (Patient p : results) {
                sb.append("|").append(formatPatient(p));
            }
            return sb.toString();
        } catch (Exception e) {
            return "ERROR|" + e.getMessage();
        }
    }

    /**
     * COUNT - returns total patient count
     */
    private String handleCount() {
        try {
            long count = patientService.count();
            return "SUCCESS|" + count;
        } catch (Exception e) {
            return "ERROR|" + e.getMessage();
        }
    }

    /**
     * Format patient data for transmission
     */
    private String formatPatient(Patient p) {
        return p.getId() + ":" + p.getName() + ":" + p.getEmail() + ":" + p.getPhone() + ":" + 
               p.getBirthDate().format(dateFormatter) + ":" + p.getAge();
    }

    public static void main(String[] args) throws IOException {
        PatientRepository repository = new InMemoryPatientRepository();
        PatientService service = new PatientService(repository);
        SocketServer server = new SocketServer(service, 9999);
        server.start();
    }
}
