package com.timetrack.repository;

import com.timetrack.entity.WorkSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Integer> {
    Optional<WorkSchedule> findByCompanyId(Integer companyId);
}
