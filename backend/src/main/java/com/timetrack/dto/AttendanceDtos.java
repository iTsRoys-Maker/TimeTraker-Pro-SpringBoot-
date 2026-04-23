package com.timetrack.dto;

import com.timetrack.dto.EmployeeDtos.EmployeeResponse;
import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;
import java.util.List;

public class AttendanceDtos {

    public record VerifyIdentityBody(@NotBlank String documentNumber) {}

    public record VerifyIdentityResponse(
            Integer employeeId, String employeeName, String department,
            boolean requiresPin, boolean requiresPhoneLast4
    ) {}

    public record PunchBody(@NotBlank String documentNumber, String pin, String phoneLast4) {}

    public record AttendanceLogResponse(
            Integer id, Integer companyId, Integer employeeId,
            String type, OffsetDateTime timestamp, String notes
    ) {}

    public record AttendanceLogWithEmployee(
            Integer id, Integer companyId, Integer employeeId,
            String type, OffsetDateTime timestamp, String notes,
            EmployeeResponse employee
    ) {}

    public record TodaySummaryData(
            OffsetDateTime checkInTime, OffsetDateTime checkOutTime,
            double workedHours, double extraHours
    ) {}

    public record PunchResponse(
            String type, EmployeeResponse employee,
            AttendanceLogResponse log, String message,
            TodaySummaryData todaySummary
    ) {}

    public record PunchFailureResponse(String error, Integer attemptsRemaining, OffsetDateTime lockedUntil) {}

    public record RegisterBody(@NotBlank String documentNumber) {}

    public record RegisterResponse(
            String type, String message, double workedHours, double extraHours
    ) {}

    public record TodaySummary(
            EmployeeRef employee,
            OffsetDateTime checkInTime, OffsetDateTime checkOutTime,
            double workedHours, double extraHours
    ) {
        public record EmployeeRef(Integer id, String name, String department, String documentNumber) {}
    }

    public record AttendanceLogsResponse(
            List<AttendanceLogWithEmployee> logs, long total, int page, int limit
    ) {}
}
