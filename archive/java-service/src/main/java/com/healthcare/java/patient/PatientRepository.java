package com.healthcare.java.patient;

import java.util.List;
import java.util.Optional;

/**
 * Patient Repository Interface - data access layer
 */
public interface PatientRepository {
    Patient save(Patient patient);
    Optional<Patient> findById(Long id);
    List<Patient> findAll();
    void delete(Long id);
    boolean existsByEmail(String email);
    List<Patient> findByNameContaining(String name);
    long count();
    void clear();
}
