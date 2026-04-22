package com.timetrack.repository;

import com.timetrack.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Integer> {
    List<Employee> findByCompanyId(Integer companyId);
    Optional<Employee> findByDocumentNumber(String documentNumber);
}
