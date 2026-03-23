package com.healthcare.java.patient;

import java.util.*;
import java.util.stream.Collectors;

/**
 * In-Memory Patient Repository - default implementation
 * Can be swapped with SQLitePatientRepository
 */
public class InMemoryPatientRepository implements PatientRepository {
    private final Map<Long, Patient> patients = new HashMap<>();
    private Long nextId = 1L;

    @Override
    public Patient save(Patient patient) {
        if (patient.getId() == null) {
            patient.setId(nextId++);
        }
        patients.put(patient.getId(), patient);
        return patient;
    }

    @Override
    public Optional<Patient> findById(Long id) {
        return Optional.ofNullable(patients.get(id));
    }

    @Override
    public List<Patient> findAll() {
        return new ArrayList<>(patients.values());
    }

    @Override
    public void delete(Long id) {
        patients.remove(id);
    }

    @Override
    public boolean existsByEmail(String email) {
        return patients.values().stream()
                .anyMatch(p -> p.getEmail().equals(email));
    }

    @Override
    public List<Patient> findByNameContaining(String name) {
        return patients.values().stream()
                .filter(p -> p.getName().toLowerCase().contains(name.toLowerCase()))
                .collect(Collectors.toList());
    }

    @Override
    public long count() {
        return patients.size();
    }

    @Override
    public void clear() {
        patients.clear();
        nextId = 1L;
    }
}
