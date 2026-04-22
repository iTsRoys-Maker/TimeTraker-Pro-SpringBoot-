package com.timetrack.service;

import com.timetrack.dto.EmployeeDtos.*;
import com.timetrack.entity.AttendanceLog;
import com.timetrack.entity.Company;
import com.timetrack.entity.Employee;
import com.timetrack.repository.AttendanceLogRepository;
import com.timetrack.repository.CompanyRepository;
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
import java.util.Locale;
import java.util.Optional;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceLogRepository attendanceLogRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;

    public List<EmployeeResponse> list(Integer companyId, String search, String status) {
        return employeeRepository.findByCompanyId(companyId).stream()
                .filter(e -> status == null || status.equalsIgnoreCase(e.getStatus()))
                .filter(e -> search == null
                        || e.getName().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))
                        || e.getDocumentNumber().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))
                        || (e.getDepartment() != null && e.getDepartment().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))))
                .map(EmployeeService::toResponse)
                .toList();
    }

    public EmployeeResponse get(Integer companyId, Integer id) {
        return toResponse(findOwned(companyId, id));
    }

    public EmployeeResponse create(Integer companyId, CreateEmployeeBody body) {
        Employee e = Employee.builder()
                .companyId(companyId)
                .documentNumber(body.documentNumber())
                .name(body.name())
                .position(body.position())
                .department(body.department())
                .email(body.email())
                .phone(body.phone())
                .status(body.status() == null ? "active" : body.status())
                .build();
        return toResponse(employeeRepository.save(e));
    }

    public EmployeeResponse update(Integer companyId, Integer id, UpdateEmployeeBody body) {
        Employee e = findOwned(companyId, id);
        if (body.documentNumber() != null) e.setDocumentNumber(body.documentNumber());
        if (body.name() != null) e.setName(body.name());
        if (body.position() != null) e.setPosition(body.position());
        if (body.department() != null) e.setDepartment(body.department());
        if (body.email() != null) e.setEmail(body.email());
        if (body.phone() != null) e.setPhone(body.phone());
        if (body.status() != null) e.setStatus(body.status());
        return toResponse(employeeRepository.save(e));
    }

    public void delete(Integer companyId, Integer id) {
        Employee e = findOwned(companyId, id);
        employeeRepository.delete(e);
    }

    public EmployeeResponse setPin(Integer companyId, Integer id, String pin) {
        Employee e = findOwned(companyId, id);
        e.setPinHash(passwordEncoder.encode(pin));
        return toResponse(employeeRepository.save(e));
    }

    public List<EmployeeWithStatus> listStatus(Integer companyId) {
        return employeeRepository.findByCompanyId(companyId).stream()
                .map(e -> {
                    List<AttendanceLog> todayLogs = attendanceLogRepository
                            .findByEmployeeIdOrderByTimestampDesc(e.getId())
                            .stream()
                            .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                            .toList();
                    AttendanceLog last = todayLogs.isEmpty() ? null : todayLogs.get(0);
                    AttendanceLog firstCheckIn = todayLogs.stream()
                            .filter(l -> "check_in".equals(l.getType()))
                            .min(Comparator.comparing(AttendanceLog::getTimestamp))
                            .orElse(null);
                    String status = "absent";
                    if (last != null) {
                        status = "check_in".equals(last.getType()) ? "inside" : "outside";
                    }
                    return new EmployeeWithStatus(
                            e.getId(), e.getCompanyId(), e.getDocumentNumber(), e.getName(),
                            e.getPosition(), e.getDepartment(), e.getStatus(), e.getEmail(), e.getPhone(),
                            e.getCreatedAt(), e.getUpdatedAt(),
                            status,
                            firstCheckIn == null ? null : firstCheckIn.getTimestamp(),
                            last == null ? null : last.getTimestamp()
                    );
                })
                .toList();
    }

    public EmployeeProfile getProfileByDocument(Integer companyIdScope, String document) {
        Employee e = employeeRepository.findByDocumentNumber(document)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Employee not found"));
        if (companyIdScope != null && !companyIdScope.equals(e.getCompanyId())) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Forbidden");
        }
        Optional<Company> company = companyRepository.findById(e.getCompanyId());

        List<AttendanceLog> all = attendanceLogRepository.findByEmployeeIdOrderByTimestampDesc(e.getId());
        List<AttendanceLog> today = all.stream()
                .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                .toList();
        OffsetDateTime checkIn = today.stream().filter(l -> "check_in".equals(l.getType()))
                .min(Comparator.comparing(AttendanceLog::getTimestamp))
                .map(AttendanceLog::getTimestamp).orElse(null);
        OffsetDateTime checkOut = today.stream().filter(l -> "check_out".equals(l.getType()))
                .max(Comparator.comparing(AttendanceLog::getTimestamp))
                .map(AttendanceLog::getTimestamp).orElse(null);
        double worked = AttendanceMath.workedHours(today);
        double extra = AttendanceMath.extraHours(worked);

        AttendanceLog last = today.isEmpty() ? null : today.get(0);
        String attendanceStatus = "absent";
        if (last != null) attendanceStatus = "check_in".equals(last.getType()) ? "inside" : "outside";

        List<EmployeeProfile.RecentLog> recent = all.stream().limit(20)
                .map(l -> new EmployeeProfile.RecentLog(l.getId(), l.getType(), l.getTimestamp(), l.getNotes()))
                .toList();

        return new EmployeeProfile(
                e.getId(), e.getCompanyId(), company.map(Company::getName).orElse(null),
                e.getDocumentNumber(), e.getName(), e.getPosition(), e.getDepartment(),
                e.getStatus(), e.getEmail(), e.getPhone(),
                e.getCreatedAt(), e.getUpdatedAt(),
                attendanceStatus, checkIn, checkOut, worked, extra, recent
        );
    }

    private Employee findOwned(Integer companyId, Integer id) {
        Employee e = employeeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Employee not found"));
        if (companyId != null && !companyId.equals(e.getCompanyId())) {
            throw new ResponseStatusException(NOT_FOUND, "Employee not found");
        }
        return e;
    }

    public static EmployeeResponse toResponse(Employee e) {
        return new EmployeeResponse(
                e.getId(), e.getCompanyId(), e.getDocumentNumber(), e.getName(),
                e.getPosition(), e.getDepartment(), e.getStatus(),
                e.getEmail(), e.getPhone(),
                e.getCreatedAt(), e.getUpdatedAt()
        );
    }
}
