package com.timetrack.service;

import com.timetrack.dto.AttendanceDtos.*;
import com.timetrack.dto.EmployeeDtos.EmployeeResponse;
import com.timetrack.entity.AttendanceLog;
import com.timetrack.entity.Employee;
import com.timetrack.repository.AttendanceLogRepository;
import com.timetrack.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_MINUTES = 10;

    private final EmployeeRepository employeeRepository;
    private final AttendanceLogRepository attendanceLogRepository;
    private final PasswordEncoder passwordEncoder;

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    public VerifyIdentityResponse verifyIdentity(VerifyIdentityBody body) {
        ensureNotLocked(body.documentNumber());
        Employee e = employeeRepository.findByDocumentNumber(body.documentNumber())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Employee not found"));
        boolean requiresPin = e.getPinHash() != null;
        boolean requiresPhone = !requiresPin && e.getPhone() != null && e.getPhone().length() >= 4;
        return new VerifyIdentityResponse(e.getId(), e.getName(), e.getDepartment(), requiresPin, requiresPhone);
    }

    public PunchResponse punch(PunchBody body) {
        ensureNotLocked(body.documentNumber());
        Employee e = employeeRepository.findByDocumentNumber(body.documentNumber())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Employee not found"));

        if (!checkSecondFactor(e, body)) {
            registerFailure(body.documentNumber());
            Attempt a = attempts.get(body.documentNumber());
            int remaining = a == null ? MAX_ATTEMPTS : Math.max(0, MAX_ATTEMPTS - a.count);
            throw new PunchAuthException(remaining, a == null ? null : a.lockedUntil);
        }
        attempts.remove(body.documentNumber());

        List<AttendanceLog> todayLogs = attendanceLogRepository.findByEmployeeIdOrderByTimestampDesc(e.getId())
                .stream()
                .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                .toList();
        AttendanceLog last = todayLogs.isEmpty() ? null : todayLogs.get(0);
        String type = (last == null || "check_out".equals(last.getType())) ? "check_in" : "check_out";

        AttendanceLog log = AttendanceLog.builder()
                .companyId(e.getCompanyId())
                .employeeId(e.getId())
                .type(type)
                .timestamp(OffsetDateTime.now())
                .build();
        log = attendanceLogRepository.save(log);

        List<AttendanceLog> updatedToday = attendanceLogRepository.findByEmployeeIdOrderByTimestampDesc(e.getId())
                .stream()
                .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                .toList();
        TodaySummaryData todaySummary = buildTodaySummary(updatedToday);

        String message = "check_in".equals(type)
                ? "¡Bienvenido, " + e.getName() + "!"
                : "Hasta luego, " + e.getName() + ".";

        return new PunchResponse(
                type,
                EmployeeService.toResponse(e),
                toLogResponse(log),
                message,
                todaySummary
        );
    }

    public TodaySummary getTodaySummary(String document) {
        Employee e = employeeRepository.findByDocumentNumber(document)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Employee not found"));
        List<AttendanceLog> today = attendanceLogRepository.findByEmployeeIdOrderByTimestampDesc(e.getId())
                .stream()
                .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                .toList();
        TodaySummaryData s = buildTodaySummary(today);
        return new TodaySummary(
                new TodaySummary.EmployeeRef(e.getId(), e.getName(), e.getDepartment(), e.getDocumentNumber()),
                s.checkInTime(), s.checkOutTime(), s.workedHours(), s.extraHours()
        );
    }

    public AttendanceLogsResponse listLogs(Integer companyId, Integer employeeId,
                                           String startDate, String endDate, int page, int limit) {
        List<AttendanceLog> base = attendanceLogRepository.findByCompanyIdOrderByTimestampDesc(companyId);
        LocalDate from = startDate == null ? null : LocalDate.parse(startDate);
        LocalDate to = endDate == null ? null : LocalDate.parse(endDate);

        List<AttendanceLog> filtered = base.stream()
                .filter(l -> employeeId == null || employeeId.equals(l.getEmployeeId()))
                .filter(l -> from == null || !l.getTimestamp().toLocalDate().isBefore(from))
                .filter(l -> to == null || !l.getTimestamp().toLocalDate().isAfter(to))
                .toList();

        long total = filtered.size();
        List<AttendanceLog> paged = filtered.stream()
                .skip((long) (page - 1) * limit)
                .limit(limit)
                .toList();

        Map<Integer, Employee> empById = employeeRepository.findAllById(
                paged.stream().map(AttendanceLog::getEmployeeId).distinct().toList()
        ).stream().collect(java.util.stream.Collectors.toMap(Employee::getId, x -> x));

        List<AttendanceLogWithEmployee> withEmp = paged.stream()
                .map(l -> {
                    Employee emp = empById.get(l.getEmployeeId());
                    return new AttendanceLogWithEmployee(
                            l.getId(), l.getCompanyId(), l.getEmployeeId(),
                            l.getType(), l.getTimestamp(), l.getNotes(),
                            emp == null ? null : EmployeeService.toResponse(emp)
                    );
                })
                .toList();
        return new AttendanceLogsResponse(withEmp, total, page, limit);
    }

    public List<AttendanceLogWithEmployee> getTodayActivity(Integer companyId) {
        List<AttendanceLog> logs = attendanceLogRepository.findByCompanyIdOrderByTimestampDesc(companyId)
                .stream()
                .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                .toList();
        Map<Integer, Employee> empById = employeeRepository.findAllById(
                logs.stream().map(AttendanceLog::getEmployeeId).distinct().toList()
        ).stream().collect(java.util.stream.Collectors.toMap(Employee::getId, x -> x));
        return logs.stream()
                .map(l -> new AttendanceLogWithEmployee(
                        l.getId(), l.getCompanyId(), l.getEmployeeId(),
                        l.getType(), l.getTimestamp(), l.getNotes(),
                        empById.containsKey(l.getEmployeeId())
                                ? EmployeeService.toResponse(empById.get(l.getEmployeeId())) : null
                ))
                .toList();
    }

    public List<AttendanceLogResponse> getEmployeeAttendance(Integer companyId, Integer employeeId,
                                                             String startDate, String endDate) {
        Employee e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Employee not found"));
        if (companyId != null && !companyId.equals(e.getCompanyId())) {
            throw new ResponseStatusException(NOT_FOUND, "Employee not found");
        }
        LocalDate from = startDate == null ? null : LocalDate.parse(startDate);
        LocalDate to = endDate == null ? null : LocalDate.parse(endDate);
        return attendanceLogRepository.findByEmployeeIdOrderByTimestampDesc(employeeId).stream()
                .filter(l -> from == null || !l.getTimestamp().toLocalDate().isBefore(from))
                .filter(l -> to == null || !l.getTimestamp().toLocalDate().isAfter(to))
                .map(AttendanceService::toLogResponse)
                .toList();
    }

    private boolean checkSecondFactor(Employee e, PunchBody body) {
        if (e.getPinHash() != null) {
            return body.pin() != null && passwordEncoder.matches(body.pin(), e.getPinHash());
        }
        if (e.getPhone() != null && e.getPhone().length() >= 4) {
            String last4 = e.getPhone().substring(e.getPhone().length() - 4);
            return last4.equals(body.phoneLast4());
        }
        // Sin segundo factor configurado: aceptar
        return true;
    }

    private void ensureNotLocked(String document) {
        Attempt a = attempts.get(document);
        if (a != null && a.lockedUntil != null && a.lockedUntil.isAfter(OffsetDateTime.now())) {
            throw new ResponseStatusException(LOCKED, "Locked. Try again later.");
        }
    }

    private void registerFailure(String document) {
        attempts.compute(document, (k, prev) -> {
            int count = (prev == null ? 0 : prev.count) + 1;
            OffsetDateTime locked = count >= MAX_ATTEMPTS
                    ? OffsetDateTime.now().plusMinutes(LOCK_MINUTES) : null;
            return new Attempt(count, locked);
        });
    }

    private TodaySummaryData buildTodaySummary(List<AttendanceLog> today) {
        OffsetDateTime checkIn = today.stream().filter(l -> "check_in".equals(l.getType()))
                .min(Comparator.comparing(AttendanceLog::getTimestamp))
                .map(AttendanceLog::getTimestamp).orElse(null);
        OffsetDateTime checkOut = today.stream().filter(l -> "check_out".equals(l.getType()))
                .max(Comparator.comparing(AttendanceLog::getTimestamp))
                .map(AttendanceLog::getTimestamp).orElse(null);
        double worked = AttendanceMath.workedHours(today);
        return new TodaySummaryData(checkIn, checkOut, worked, AttendanceMath.extraHours(worked));
    }

    public static AttendanceLogResponse toLogResponse(AttendanceLog l) {
        return new AttendanceLogResponse(l.getId(), l.getCompanyId(), l.getEmployeeId(),
                l.getType(), l.getTimestamp(), l.getNotes());
    }

    private record Attempt(int count, OffsetDateTime lockedUntil) {}

    public static class PunchAuthException extends RuntimeException {
        public final Integer attemptsRemaining;
        public final OffsetDateTime lockedUntil;
        public PunchAuthException(Integer attemptsRemaining, OffsetDateTime lockedUntil) {
            super("Invalid second factor");
            this.attemptsRemaining = attemptsRemaining;
            this.lockedUntil = lockedUntil;
        }
    }
}
