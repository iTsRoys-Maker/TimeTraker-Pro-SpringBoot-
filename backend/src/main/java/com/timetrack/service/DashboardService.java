package com.timetrack.service;

import com.timetrack.dto.DashboardDtos.*;
import com.timetrack.entity.AttendanceLog;
import com.timetrack.entity.Company;
import com.timetrack.entity.Employee;
import com.timetrack.repository.AttendanceLogRepository;
import com.timetrack.repository.CompanyRepository;
import com.timetrack.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceLogRepository attendanceLogRepository;
    private final CompanyRepository companyRepository;

    public DashboardSummary summary(Integer companyId) {
        List<Employee> employees = employeeRepository.findByCompanyId(companyId);
        long total = employees.size();

        List<AttendanceLog> today = attendanceLogRepository.findByCompanyIdOrderByTimestampDesc(companyId)
                .stream()
                .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                .toList();

        long checkIns = today.stream().filter(l -> "check_in".equals(l.getType())).count();
        long checkOuts = today.stream().filter(l -> "check_out".equals(l.getType())).count();
        Set<Integer> activeIds = today.stream().map(AttendanceLog::getEmployeeId).collect(Collectors.toSet());
        long active = activeIds.size();
        long absent = Math.max(0, total - active);

        return new DashboardSummary(total, active, checkIns, checkOuts, absent);
    }

    public List<AttendanceTrendDay> attendanceTrends(Integer companyId) {
        return trendsForLogs(attendanceLogRepository.findByCompanyIdOrderByTimestampDesc(companyId));
    }

    public GlobalSummary globalSummary() {
        long companies = companyRepository.count();
        long employees = employeeRepository.count();
        List<AttendanceLog> today = attendanceLogRepository.findAll().stream()
                .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                .toList();
        long ci = today.stream().filter(l -> "check_in".equals(l.getType())).count();
        long co = today.stream().filter(l -> "check_out".equals(l.getType())).count();
        long activeCompanies = today.stream().map(AttendanceLog::getCompanyId).collect(Collectors.toSet()).size();
        return new GlobalSummary(companies, employees, ci, co, activeCompanies);
    }

    public List<AttendanceTrendDay> globalTrends() {
        return trendsForLogs(attendanceLogRepository.findAll());
    }

    public List<CompanyBreakdown> companiesBreakdown() {
        List<Company> companies = companyRepository.findAll();
        List<AttendanceLog> today = attendanceLogRepository.findAll().stream()
                .filter(l -> l.getTimestamp().toLocalDate().equals(LocalDate.now(ZoneOffset.UTC)))
                .toList();
        return companies.stream().map(c -> {
            long emp = employeeRepository.findByCompanyId(c.getId()).size();
            long ci = today.stream().filter(l -> c.getId().equals(l.getCompanyId()) && "check_in".equals(l.getType())).count();
            long co = today.stream().filter(l -> c.getId().equals(l.getCompanyId()) && "check_out".equals(l.getType())).count();
            return new CompanyBreakdown(c.getId(), c.getName(), emp, ci, co);
        }).toList();
    }

    private List<AttendanceTrendDay> trendsForLogs(List<AttendanceLog> all) {
        List<AttendanceTrendDay> days = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;
        Set<LocalDate> recent = new HashSet<>();
        for (int i = 6; i >= 0; i--) recent.add(LocalDate.now(ZoneOffset.UTC).minusDays(i));
        for (int i = 6; i >= 0; i--) {
            LocalDate d = LocalDate.now(ZoneOffset.UTC).minusDays(i);
            long ci = all.stream().filter(l -> "check_in".equals(l.getType()) && l.getTimestamp().toLocalDate().equals(d)).count();
            long co = all.stream().filter(l -> "check_out".equals(l.getType()) && l.getTimestamp().toLocalDate().equals(d)).count();
            days.add(new AttendanceTrendDay(d.format(fmt), ci, co));
        }
        return days;
    }
}
