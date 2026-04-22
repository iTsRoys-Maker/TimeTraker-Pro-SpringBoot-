package com.timetrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.OffsetDateTime;
import java.util.List;

public class EmployeeDtos {

    public record EmployeeResponse(
            Integer id, Integer companyId, String documentNumber, String name,
            String position, String department, String status,
            String email, String phone,
            OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public record CreateEmployeeBody(
            @NotBlank String documentNumber,
            @NotBlank String name,
            @NotBlank String position,
            @NotBlank String department,
            String email,
            String phone,
            String status
    ) {}

    public record UpdateEmployeeBody(
            String documentNumber, String name, String position, String department,
            String email, String phone, String status
    ) {}

    public record SetPinBody(@Pattern(regexp = "\\d{4}", message = "PIN must be 4 digits") String pin) {}

    public record EmployeeWithStatus(
            Integer id, Integer companyId, String documentNumber, String name,
            String position, String department, String status,
            String email, String phone,
            OffsetDateTime createdAt, OffsetDateTime updatedAt,
            String attendanceStatus, OffsetDateTime lastCheckIn, OffsetDateTime lastLogTime
    ) {}

    public record EmployeeProfile(
            Integer id, Integer companyId, String companyName,
            String documentNumber, String name, String position, String department,
            String status, String email, String phone,
            OffsetDateTime createdAt, OffsetDateTime updatedAt,
            String attendanceStatus, OffsetDateTime checkInTime, OffsetDateTime checkOutTime,
            double workedHoursToday, double extraHoursToday,
            List<RecentLog> recentLogs
    ) {
        public record RecentLog(Integer id, String type, OffsetDateTime timestamp, String notes) {}
    }
}
