package com.healthcare.java.patient;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Patient Service - delegates to repository for persistence
 * Handles business logic and validation
 */
public class PatientService {
    private final PatientRepository repository;

    public PatientService(PatientRepository repository) {
        this.repository = repository;
    }

    // CRUD Operations
    public Patient create(Patient patient) {
        if (patient == null) throw new IllegalArgumentException("Patient cannot be null");
        if (repository.existsByEmail(patient.getEmail())) 
            throw new IllegalArgumentException("Email already exists: " + patient.getEmail());

        patient.setCreatedAt(LocalDateTime.now());
        patient.setUpdatedAt(LocalDateTime.now());
        return repository.save(patient);
    }

    public Patient getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Patient not found: " + id));
    }

    public List<Patient> getAll() {
        return repository.findAll();
    }

    public Patient update(Long id, Patient updated) {
        Patient existing = getById(id);
        
        if (!existing.getEmail().equals(updated.getEmail()) && repository.existsByEmail(updated.getEmail())) 
            throw new IllegalArgumentException("Email already exists: " + updated.getEmail());

        existing.setName(updated.getName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setBirthDate(updated.getBirthDate());
        existing.setUpdatedAt(LocalDateTime.now());
        return repository.save(existing);
    }

    public void delete(Long id) {
        getById(id); // Verify exists
        repository.delete(id);
    }

    // Search & Filter
    public List<Patient> findByName(String name) {
        return repository.findByNameContaining(name);
    }

    public List<Patient> findByAgeRange(int minAge, int maxAge) {
        return getAll().stream()
                .filter(p -> p.getAge() >= minAge && p.getAge() <= maxAge)
                .collect(Collectors.toList());
    }

    public List<Patient> getSeniors() {
        return getAll().stream()
                .filter(Patient::isSenior)
                .collect(Collectors.toList());
    }

    public boolean patientExistsByEmail(String email) {
        return repository.existsByEmail(email);
    }

    public long count() {
        return repository.count();
    }

    // Utility
    public void clear() {
        repository.clear();
    }
}
