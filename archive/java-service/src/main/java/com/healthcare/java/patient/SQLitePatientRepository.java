package com.healthcare.java.patient;

import java.sql.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.sql.Date;
import java.sql.Timestamp;

/**
 * SQLite Patient Repository - persistent storage
 * Requires SQLite JDBC driver in pom.xml
 */
public class SQLitePatientRepository implements PatientRepository {
    private final String dbUrl;
    private final String dbPath = "data/patient_records.db";

    public SQLitePatientRepository() {
        this.dbUrl = "jdbc:sqlite:" + dbPath;
        initDatabase();
    }

    public SQLitePatientRepository(String customPath) {
        this.dbUrl = "jdbc:sqlite:" + customPath;
        initDatabase();
    }

    /**
     * Initialize database schema
     */
    private void initDatabase() {
        String createTableSQL = """
                CREATE TABLE IF NOT EXISTS patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    birth_date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_email ON patients(email);
                CREATE INDEX IF NOT EXISTS idx_name ON patients(name);
                """;

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            for (String sql : createTableSQL.split(";")) {
                if (!sql.trim().isEmpty()) {
                    stmt.execute(sql.trim());
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to initialize database", e);
        }
    }

    /**
     * Get database connection
     */
    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl);
    }

    @Override
    public Patient save(Patient patient) {
        if (patient.getId() == null) {
            return insert(patient);
        } else {
            return update(patient);
        }
    }

    private Patient insert(Patient patient) {
        String sql = "INSERT INTO patients (name, email, phone, birth_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setString(1, patient.getName());
            pstmt.setString(2, patient.getEmail());
            pstmt.setString(3, patient.getPhone());
            pstmt.setDate(4, java.sql.Date.valueOf(patient.getBirthDate()));
            pstmt.setTimestamp(5, java.sql.Timestamp.valueOf(LocalDateTime.now()));
            pstmt.setTimestamp(6, java.sql.Timestamp.valueOf(LocalDateTime.now()));

            pstmt.executeUpdate();

            try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    patient.setId(generatedKeys.getLong(1));
                }
            }
            return patient;
        } catch (SQLException e) {
            throw new RuntimeException("Failed to insert patient", e);
        }
    }

    private Patient update(Patient patient) {
        String sql = "UPDATE patients SET name = ?, email = ?, phone = ?, birth_date = ?, updated_at = ? WHERE id = ?";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, patient.getName());
            pstmt.setString(2, patient.getEmail());
            pstmt.setString(3, patient.getPhone());
            pstmt.setDate(4, java.sql.Date.valueOf(patient.getBirthDate()));
            pstmt.setTimestamp(5, java.sql.Timestamp.valueOf(LocalDateTime.now()));
            pstmt.setLong(6, patient.getId());

            pstmt.executeUpdate();
            return patient;
        } catch (SQLException e) {
            throw new RuntimeException("Failed to update patient", e);
        }
    }

    @Override
    public Optional<Patient> findById(Long id) {
        String sql = "SELECT * FROM patients WHERE id = ?";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setLong(1, id);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                return Optional.of(mapResultSetToPatient(rs));
            }
            return Optional.empty();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find patient", e);
        }
    }

    @Override
    public List<Patient> findAll() {
        String sql = "SELECT * FROM patients ORDER BY created_at DESC";
        List<Patient> patients = new ArrayList<>();

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                patients.add(mapResultSetToPatient(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to fetch all patients", e);
        }

        return patients;
    }

    @Override
    public void delete(Long id) {
        String sql = "DELETE FROM patients WHERE id = ?";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setLong(1, id);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to delete patient", e);
        }
    }

    @Override
    public boolean existsByEmail(String email) {
        String sql = "SELECT 1 FROM patients WHERE email = ?";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, email);
            return pstmt.executeQuery().next();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to check email existence", e);
        }
    }

    @Override
    public List<Patient> findByNameContaining(String name) {
        String sql = "SELECT * FROM patients WHERE LOWER(name) LIKE ? ORDER BY name";
        List<Patient> patients = new ArrayList<>();

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, "%" + name.toLowerCase() + "%");
            ResultSet rs = pstmt.executeQuery();

            while (rs.next()) {
                patients.add(mapResultSetToPatient(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find patients by name", e);
        }

        return patients;
    }

    @Override
    public long count() {
        String sql = "SELECT COUNT(*) as total FROM patients";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            if (rs.next()) {
                return rs.getLong("total");
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to count patients", e);
        }

        return 0;
    }

    @Override
    public void clear() {
        String sql = "DELETE FROM patients";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to clear patients", e);
        }
    }

    /**
     * Map ResultSet row to Patient object
     */
    private Patient mapResultSetToPatient(ResultSet rs) throws SQLException {
        return Patient.builder()
                .id(rs.getLong("id"))
                .name(rs.getString("name"))
                .email(rs.getString("email"))
                .phone(rs.getString("phone"))
                .birthDate(rs.getDate("birth_date").toLocalDate())
                .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                .updatedAt(rs.getTimestamp("updated_at").toLocalDateTime())
                .build();
    }
}
