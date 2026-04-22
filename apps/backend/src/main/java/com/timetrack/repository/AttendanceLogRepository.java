package com.timetrack.repository;

import com.timetrack.entity.AttendanceLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Integer> {
    List<AttendanceLog> findByCompanyIdOrderByTimestampDesc(Integer companyId);
    List<AttendanceLog> findByEmployeeIdOrderByTimestampDesc(Integer employeeId);
}
