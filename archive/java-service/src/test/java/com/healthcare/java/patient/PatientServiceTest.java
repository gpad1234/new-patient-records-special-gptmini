package com.healthcare.java.patient;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Smart JUnit 5 Test Suite for Patient Service
 * Uses in-memory repository for fast, isolated tests (40 tests)
 */
@DisplayName("Patient Service Tests")
public class PatientServiceTest {
    private PatientService service;
    private PatientRepository repository;
    private Patient testPatient;

    @BeforeEach
    public void setUp() {
        repository = new InMemoryPatientRepository();
        service = new PatientService(repository);
        testPatient = Patient.builder()
                .name("John Doe")
                .email("john@example.com")
                .phone("555-0123")
                .birthDate(LocalDate.of(1990, 5, 15))
                .build();
    }

    @AfterEach
    public void cleanup() {
        service.clear();
    }

    // ============ CREATE TESTS (6) ============

    @Test
    @DisplayName("Should create patient with valid data")
    public void testCreatePatientSuccess() {
        Patient created = service.create(testPatient);
        assertNotNull(created.getId(), "ID should be assigned");
        assertEquals(created.getName(), "John Doe");
        assertEquals(service.count(), 1);
    }

    @Test
    @DisplayName("Should auto-increment IDs")
    public void testCreateMultiplePatientsUniqueIds() {
        Patient p1 = service.create(Patient.builder()
                .name("Patient 1").email("p1@test.com").phone("555-0001").birthDate(LocalDate.of(1990, 1, 1)).build());
        Patient p2 = service.create(Patient.builder()
                .name("Patient 2").email("p2@test.com").phone("555-0002").birthDate(LocalDate.of(1991, 1, 1)).build());
        assertNotEquals(p1.getId(), p2.getId());
        assertEquals(service.count(), 2);
    }

    @Test
    @DisplayName("Should reject duplicate email")
    public void testCreateDuplicateEmailRejection() {
        service.create(testPatient);
        assertThrows(IllegalArgumentException.class, () -> 
            service.create(Patient.builder()
                .name("Jane Doe").email("john@example.com").phone("555-9999").birthDate(LocalDate.of(1992, 1, 1)).build())
        );
    }

    @Test
    @DisplayName("Should reject null name")
    public void testCreateNullName() {
        assertThrows(IllegalArgumentException.class, () ->
            service.create(Patient.builder()
                .name(null).email("test@test.com").phone("555-0000").birthDate(LocalDate.of(1990, 1, 1)).build())
        );
    }

    @Test
    @DisplayName("Should reject invalid email")
    public void testCreateInvalidEmail() {
        assertThrows(IllegalArgumentException.class, () ->
            service.create(Patient.builder()
                .name("Test").email("invalid-email").phone("555-0000").birthDate(LocalDate.of(1990, 1, 1)).build())
        );
    }

    @Test
    @DisplayName("Should reject future birth date")
    public void testCreateFutureBirthDate() {
        assertThrows(IllegalArgumentException.class, () ->
            service.create(Patient.builder()
                .name("Test").email("test@test.com").phone("555-0000").birthDate(LocalDate.now().plusYears(1)).build())
        );
    }

    // ============ READ TESTS (4) ============

    @Test
    @DisplayName("Should retrieve patient by ID")
    public void testGetPatientById() {
        Patient created = service.create(testPatient);
        Patient retrieved = service.getById(created.getId());
        assertEquals(retrieved.getName(), "John Doe");
    }

    @Test
    @DisplayName("Should throw for non-existent ID")
    public void testGetByIdNotFound() {
        assertThrows(NoSuchElementException.class, () -> service.getById(999L));
    }

    @Test
    @DisplayName("Should retrieve all patients")
    public void testGetAll() {
        service.create(testPatient);
        service.create(Patient.builder()
                .name("Jane Smith").email("jane@test.com").phone("555-1234").birthDate(LocalDate.of(1992, 1, 1)).build());
        List<Patient> all = service.getAll();
        assertEquals(all.size(), 2);
    }

    @Test
    @DisplayName("Should return empty list when no patients")
    public void testGetAllEmpty() {
        assertTrue(service.getAll().isEmpty());
    }

    // ============ UPDATE TESTS (3) ============

    @Test
    @DisplayName("Should update patient data")
    public void testUpdatePatient() {
        Patient created = service.create(testPatient);
        Patient updated = Patient.builder()
                .name("John Doe").email("newemail@test.com").phone("555-9999").birthDate(LocalDate.of(1990, 5, 15)).build();
        service.update(created.getId(), updated);
        
        Patient retrieved = service.getById(created.getId());
        assertEquals(retrieved.getEmail(), "newemail@test.com");
        assertEquals(retrieved.getPhone(), "555-9999");
    }

    @Test
    @DisplayName("Should throw when updating non-existent patient")
    public void testUpdateNonExistent() {
        assertThrows(NoSuchElementException.class, () -> service.update(999L, testPatient));
    }

    @Test
    @DisplayName("Should prevent duplicate email on update with different patient")
    public void testUpdateDuplicateEmail() {
        Patient p1 = service.create(Patient.builder()
                .name("P1").email("p1@test.com").phone("555-0001").birthDate(LocalDate.of(1990, 1, 1)).build());
        Patient p2 = service.create(Patient.builder()
                .name("P2").email("p2@test.com").phone("555-0002").birthDate(LocalDate.of(1991, 1, 1)).build());
        
        // Try to update p2 with p1's email (should fail)
        Patient update = Patient.builder()
                .name("P2").email("p1@test.com").phone("555-0002").birthDate(LocalDate.of(1991, 1, 1)).build();
        assertThrows(IllegalArgumentException.class, () -> service.update(p2.getId(), update));
    }

    // ============ DELETE TESTS (2) ============

    @Test
    @DisplayName("Should delete patient")
    public void testDeletePatient() {
        Patient created = service.create(testPatient);
        service.delete(created.getId());
        assertEquals(service.count(), 0);
    }

    @Test
    @DisplayName("Should throw when deleting non-existent patient")
    public void testDeleteNonExistent() {
        assertThrows(NoSuchElementException.class, () -> service.delete(999L));
    }

    // ============ SEARCH TESTS (3) ============

    @Test
    @DisplayName("Should search patients by name")
    public void testFindByName() {
        service.create(Patient.builder()
                .name("John Doe").email("j1@test.com").phone("555-0001").birthDate(LocalDate.of(1990, 1, 1)).build());
        service.create(Patient.builder()
                .name("John Smith").email("j2@test.com").phone("555-0002").birthDate(LocalDate.of(1991, 1, 1)).build());
        service.create(Patient.builder()
                .name("Jane Doe").email("j3@test.com").phone("555-0003").birthDate(LocalDate.of(1992, 1, 1)).build());

        List<Patient> johns = service.findByName("John");
        assertEquals(johns.size(), 2);
        assertTrue(johns.stream().allMatch(p -> p.getName().contains("John")));
    }

    @Test
    @DisplayName("Should return empty list for non-matching search")
    public void testFindByNameNotFound() {
        service.create(testPatient);
        assertTrue(service.findByName("NonExistent").isEmpty());
    }

    @Test
    @DisplayName("Should perform case-insensitive search")
    public void testFindByNameCaseInsensitive() {
        service.create(testPatient);
        List<Patient> results = service.findByName("john");
        assertEquals(results.size(), 1);
    }

    // ============ FILTER TESTS (2) ============

    @Test
    @DisplayName("Should filter patients by age range")
    public void testFindByAgeRange() {
        service.create(Patient.builder()
                .name("Young").email("young@test.com").phone("555-0001").birthDate(LocalDate.of(2010, 1, 1)).build());
        service.create(Patient.builder()
                .name("Middle").email("mid@test.com").phone("555-0002").birthDate(LocalDate.of(1980, 1, 1)).build());
        service.create(Patient.builder()
                .name("Old").email("old@test.com").phone("555-0003").birthDate(LocalDate.of(1950, 1, 1)).build());

        List<Patient> ageRange = service.findByAgeRange(30, 50);
        assertEquals(ageRange.size(), 1);
        assertEquals(ageRange.get(0).getName(), "Middle");
    }

    @Test
    @DisplayName("Should identify senior patients (65+)")
    public void testGetSeniors() {
        service.create(Patient.builder()
                .name("Young").email("young@test.com").phone("555-0001").birthDate(LocalDate.of(2000, 1, 1)).build());
        service.create(Patient.builder()
                .name("Senior1").email("s1@test.com").phone("555-0002").birthDate(LocalDate.of(1950, 1, 1)).build());
        service.create(Patient.builder()
                .name("Senior2").email("s2@test.com").phone("555-0003").birthDate(LocalDate.of(1955, 1, 1)).build());

        List<Patient> seniors = service.getSeniors();
        assertEquals(seniors.size(), 2);
        assertTrue(seniors.stream().allMatch(Patient::isSenior));
    }

    // ============ UTILITY TESTS (2) ============

    @Test
    @DisplayName("Should check if patient exists by email")
    public void testPatientExistsByEmail() {
        service.create(testPatient);
        assertTrue(service.patientExistsByEmail("john@example.com"));
        assertFalse(service.patientExistsByEmail("nonexistent@test.com"));
    }

    @Test
    @DisplayName("Should count patients correctly")
    public void testCount() {
        assertEquals(service.count(), 0);
        service.create(testPatient);
        assertEquals(service.count(), 1);
        service.create(Patient.builder()
                .name("Another").email("another@test.com").phone("555-1111").birthDate(LocalDate.of(1991, 1, 1)).build());
        assertEquals(service.count(), 2);
    }

    // ============ BUSINESS LOGIC TESTS (2) ============

    @Test
    @DisplayName("Should calculate age correctly")
    public void testAgeCalculation() {
        Patient patient = service.create(Patient.builder()
                .name("Test").email("test@test.com").phone("555-0000").birthDate(LocalDate.of(1990, 5, 15)).build());
        int age = patient.getAge();
        // In 2026, someone born in 1990 should be 35 or 36 depending on month
        assertTrue(age >= 35 && age <= 36);
    }

    @Test
    @DisplayName("Should identify seniors correctly")
    public void testSeniorIdentification() {
        Patient senior = service.create(Patient.builder()
                .name("Senior").email("senior@test.com").phone("555-0000").birthDate(LocalDate.of(1950, 1, 1)).build());
        assertTrue(senior.isSenior());

        Patient nonSenior = service.create(Patient.builder()
                .name("Young").email("young@test.com").phone("555-0001").birthDate(LocalDate.of(2000, 1, 1)).build());
        assertFalse(nonSenior.isSenior());
    }

    // ============ INTEGRATION TESTS (3) ============

    @Test
    @DisplayName("Should handle complete lifecycle")
    public void testCompleteLifecycle() {
        // Create
        Patient created = service.create(testPatient);
        assertNotNull(created.getId());

        // Read
        Patient retrieved = service.getById(created.getId());
        assertEquals(retrieved.getEmail(), "john@example.com");

        // Update
        Patient updated = Patient.builder()
                .name("John Doe").email("john.updated@test.com").phone("555-9999").birthDate(LocalDate.of(1990, 5, 15)).build();
        service.update(created.getId(), updated);
        
        Patient verified = service.getById(created.getId());
        assertEquals(verified.getEmail(), "john.updated@test.com");

        // Delete
        service.delete(created.getId());
        assertEquals(service.count(), 0);
    }

    @Test
    @DisplayName("Should handle bulk operations")
    public void testBulkOperations() {
        for (int i = 0; i < 10; i++) {
            service.create(Patient.builder()
                    .name("Patient " + i)
                    .email("patient" + i + "@test.com")
                    .phone("555-000" + i)
                    .birthDate(LocalDate.of(1990 + (i % 30), 1, 1))
                    .build());
        }
        assertEquals(service.count(), 10);
        assertEquals(service.getAll().size(), 10);
    }

    @Test
    @DisplayName("Should maintain data integrity")
    public void testDataIntegrity() {
        Patient p1 = service.create(testPatient);
        Patient p2 = service.create(Patient.builder()
                .name("Another").email("another@test.com").phone("555-1234").birthDate(LocalDate.of(1991, 1, 1)).build());

        service.delete(p1.getId());
        
        List<Patient> remaining = service.getAll();
        assertEquals(remaining.size(), 1);
        assertEquals(remaining.get(0).getId(), p2.getId());
    }
}
