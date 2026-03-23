package com.healthcare.java.patient;

import java.io.*;
import java.net.*;
import java.util.Scanner;

/**
 * TCP Client for Patient Records Socket Server
 * Interactive command-line interface for CRUD operations
 * 
 * Usage: java SocketClient [host] [port]
 * Default: localhost 9999
 * 
 * Commands:
 *   CREATE name email phone birthDate(yyyy-MM-dd)
 *   GET id
 *   UPDATE id name email phone birthDate(yyyy-MM-dd)
 *   DELETE id
 *   LIST
 *   SEARCH name
 *   COUNT
 *   HELP
 *   EXIT
 */
public class SocketClient {
    private final String host;
    private final int port;
    private Socket socket;
    private PrintWriter out;
    private BufferedReader in;

    public SocketClient(String host, int port) {
        this.host = host;
        this.port = port;
    }

    /**
     * Connect to the server
     */
    public void connect() throws IOException {
        socket = new Socket(host, port);
        out = new PrintWriter(socket.getOutputStream(), true);
        in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        System.out.println("✓ Connected to " + host + ":" + port);
        System.out.println("Type 'HELP' for available commands or 'EXIT' to quit\n");
    }

    /**
     * Close connection
     */
    public void disconnect() throws IOException {
        if (socket != null && !socket.isClosed()) {
            out.println("EXIT");
            socket.close();
            System.out.println("✓ Disconnected");
        }
    }

    /**
     * Send command to server and get response
     */
    public String sendCommand(String command) throws IOException {
        out.println(command);
        return in.readLine();
    }

    /**
     * Parse and display response
     */
    private void displayResponse(String response) {
        if (response == null) {
            System.out.println("✗ Connection lost");
            return;
        }

        if (response.startsWith("SUCCESS|")) {
            String[] parts = response.substring(8).split("\\|");
            
            switch (parts.length) {
                case 1:
                    // COUNT result or simple success
                    if (parts[0].matches("\\d+")) {
                        System.out.println("✓ Count: " + parts[0]);
                    } else {
                        System.out.println("✓ " + parts[0]);
                    }
                    break;
                case 2:
                    // Two-part response
                    System.out.println("✓ " + parts[1]);
                    break;
                case 3:
                    // Create response: id|name|email
                    System.out.println("✓ Patient created:");
                    System.out.println("  ID: " + parts[0]);
                    System.out.println("  Name: " + parts[1]);
                    System.out.println("  Email: " + parts[2]);
                    break;
                default:
                    // Patient data: id:name:email:phone:birthDate:age
                    displayPatientData(parts);
                    break;
            }
        } else if (response.startsWith("ERROR|")) {
            System.out.println("✗ Error: " + response.substring(6));
        } else {
            System.out.println(response);
        }
    }

    /**
     * Parse and display patient data
     */
    private void displayPatientData(String[] parts) {
        if (parts[0].equals("0")) {
            System.out.println("✓ No results");
            return;
        }

        int count = Integer.parseInt(parts[0]);
        System.out.println("✓ Found " + count + " patient(s):\n");

        for (int i = 1; i < parts.length; i++) {
            String[] data = parts[i].split(":");
            if (data.length >= 6) {
                System.out.println("  Patient #" + i + ":");
                System.out.println("    ID: " + data[0]);
                System.out.println("    Name: " + data[1]);
                System.out.println("    Email: " + data[2]);
                System.out.println("    Phone: " + data[3]);
                System.out.println("    Birth Date: " + data[4]);
                System.out.println("    Age: " + data[5]);
                System.out.println();
            }
        }
    }

    /**
     * Display help
     */
    private void showHelp() {
        System.out.println("""
            Available Commands:
            
            CREATE <name> <email> <phone> <birthDate>
              Example: CREATE "John Doe" john@test.com 555-1234 1990-05-15
              
            GET <id>
              Example: GET 1
              
            UPDATE <id> <name> <email> <phone> <birthDate>
              Example: UPDATE 1 "John Smith" john.new@test.com 555-9999 1990-05-15
              
            DELETE <id>
              Example: DELETE 1
              
            LIST
              Display all patients
              
            SEARCH <name>
              Example: SEARCH John
              
            COUNT
              Get total patient count
              
            HELP
              Show this help message
              
            EXIT
              Close connection and exit
            """);
    }

    /**
     * Interactive command loop
     */
    public void interactiveMode() {
        Scanner scanner = new Scanner(System.in);
        String input;

        while (true) {
            System.out.print("> ");
            input = scanner.nextLine().trim();

            if (input.isEmpty()) {
                continue;
            }

            // Extract command (first word, case-insensitive)
            int spaceIdx = input.indexOf(' ');
            String command;
            String args;
            
            if (spaceIdx == -1) {
                command = input.toUpperCase();
                args = "";
            } else {
                command = input.substring(0, spaceIdx).toUpperCase();
                args = input.substring(spaceIdx + 1).trim();
            }

            try {
                switch (command) {
                    case "EXIT":
                        disconnect();
                        scanner.close();
                        System.out.println("Goodbye!");
                        return;

                    case "HELP":
                        showHelp();
                        break;

                    case "CREATE":
                        handleCreate(args);
                        break;

                    case "GET":
                        handleGet(args);
                        break;

                    case "UPDATE":
                        handleUpdate(args);
                        break;

                    case "DELETE":
                        handleDelete(args);
                        break;

                    case "LIST":
                        handleList();
                        break;

                    case "SEARCH":
                        handleSearch(args);
                        break;

                    case "COUNT":
                        handleCount();
                        break;

                    default:
                        System.out.println("✗ Unknown command: " + command);
                        System.out.println("  Type 'HELP' for available commands");
                }
            } catch (IOException e) {
                System.out.println("✗ Connection error: " + e.getMessage());
                try {
                    disconnect();
                } catch (IOException ignored) {}
                return;
            }
        }
    }

    private void handleCreate(String args) throws IOException {
        String[] parts = parseQuotedArgs(args);
        if (parts.length != 4) {
            System.out.println("✗ Usage: CREATE name email phone birthDate");
            return;
        }
        String response = sendCommand("CREATE|" + parts[0] + "|" + parts[1] + "|" + parts[2] + "|" + parts[3]);
        displayResponse(response);
    }

    private void handleGet(String args) throws IOException {
        if (args.isEmpty()) {
            System.out.println("✗ Usage: GET id");
            return;
        }
        String response = sendCommand("GET|" + args);
        displayResponse(response);
    }

    private void handleUpdate(String args) throws IOException {
        String[] parts = parseQuotedArgs(args);
        if (parts.length < 5) {
            System.out.println("✗ Usage: UPDATE id name email phone birthDate");
            return;
        }
        String response = sendCommand("UPDATE|" + parts[0] + "|" + parts[1] + "|" + parts[2] + "|" + parts[3] + "|" + parts[4]);
        displayResponse(response);
    }

    private void handleDelete(String args) throws IOException {
        if (args.isEmpty()) {
            System.out.println("✗ Usage: DELETE id");
            return;
        }
        String response = sendCommand("DELETE|" + args);
        displayResponse(response);
    }

    private void handleList() throws IOException {
        String response = sendCommand("LIST");
        displayResponse(response);
    }

    private void handleSearch(String name) throws IOException {
        if (name.isEmpty()) {
            System.out.println("✗ Usage: SEARCH name");
            return;
        }
        String response = sendCommand("SEARCH|" + name);
        displayResponse(response);
    }

    private void handleCount() throws IOException {
        String response = sendCommand("COUNT");
        displayResponse(response);
    }

    /**
     * Parse arguments, handling quoted strings
     */
    private String[] parseQuotedArgs(String input) {
        java.util.List<String> args = new java.util.ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (char c : input.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ' ' && !inQuotes) {
                if (current.length() > 0) {
                    args.add(current.toString());
                    current = new StringBuilder();
                }
            } else {
                current.append(c);
            }
        }

        if (current.length() > 0) {
            args.add(current.toString());
        }

        return args.toArray(new String[0]);
    }

    public static void main(String[] args) {
        String host = "localhost";
        int port = 9999;

        if (args.length > 0) {
            host = args[0];
        }
        if (args.length > 1) {
            try {
                port = Integer.parseInt(args[1]);
            } catch (NumberFormatException e) {
                System.err.println("Invalid port number: " + args[1]);
                System.exit(1);
            }
        }

        SocketClient client = new SocketClient(host, port);

        try {
            client.connect();
            client.interactiveMode();
        } catch (IOException e) {
            System.err.println("Connection error: " + e.getMessage());
            System.exit(1);
        }
    }
}
