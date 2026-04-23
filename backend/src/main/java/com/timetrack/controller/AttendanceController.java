package com.timetrack.controller;

import com.timetrack.dto.AttendanceDtos.*;
import com.timetrack.service.AttendanceService;
import com.timetrack.service.AttendanceService.PunchAuthException;
import com.timetrack.service.SecurityHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final SecurityHelper security;

    @PostMapping("/verify-identity")
    public VerifyIdentityResponse verifyIdentity(@Valid @RequestBody VerifyIdentityBody body) {
        return attendanceService.verifyIdentity(body);
    }

    @PostMapping("/punch")
    public ResponseEntity<?> punch(@Valid @RequestBody PunchBody body) {
        try {
            return ResponseEntity.ok(attendanceService.punch(body));
        } catch (PunchAuthException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new PunchFailureResponse(ex.getMessage(), ex.attemptsRemaining, ex.lockedUntil));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterBody body) {
        try {
            PunchResponse r = attendanceService.punch(new PunchBody(body.documentNumber(), null, null));
            String typeUpper = "check_in".equals(r.type()) ? "CHECK_IN" : "CHECK_OUT";
            double worked = r.todaySummary() == null ? 0 : r.todaySummary().workedHours();
            double extra = r.todaySummary() == null ? 0 : r.todaySummary().extraHours();
            return ResponseEntity.ok(new RegisterResponse(typeUpper, r.message(), worked, extra));
        } catch (PunchAuthException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new PunchFailureResponse(ex.getMessage(), ex.attemptsRemaining, ex.lockedUntil));
        }
    }

    @GetMapping("/today-summary/{document}")
    public TodaySummary todaySummary(@PathVariable String document) {
        return attendanceService.getTodaySummary(document);
    }

    @GetMapping("/logs")
    public AttendanceLogsResponse logs(@RequestParam(required = false) Integer employeeId,
                                       @RequestParam(required = false) String startDate,
                                       @RequestParam(required = false) String endDate,
                                       @RequestParam(defaultValue = "1") int page,
                                       @RequestParam(defaultValue = "50") int limit) {
        return attendanceService.listLogs(security.requireCompanyId(), employeeId, startDate, endDate, page, limit);
    }

    @GetMapping("/today")
    public List<AttendanceLogWithEmployee> today() {
        return attendanceService.getTodayActivity(security.requireCompanyId());
    }

    @GetMapping("/employee/{id}")
    public List<AttendanceLogResponse> employee(@PathVariable Integer id,
                                                @RequestParam(required = false) String startDate,
                                                @RequestParam(required = false) String endDate) {
        return attendanceService.getEmployeeAttendance(security.requireCompanyId(), id, startDate, endDate);
    }
}
