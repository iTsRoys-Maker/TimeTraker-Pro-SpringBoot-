package com.timetrack.controller;

import com.timetrack.dto.DashboardDtos.*;
import com.timetrack.service.DashboardService;
import com.timetrack.service.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService service;
    private final SecurityHelper security;

    @GetMapping("/summary")
    public DashboardSummary summary() {
        return service.summary(security.requireCompanyId());
    }

    @GetMapping("/attendance-trends")
    public List<AttendanceTrendDay> attendanceTrends() {
        return service.attendanceTrends(security.requireCompanyId());
    }

    @GetMapping("/global-summary")
    public GlobalSummary globalSummary() {
        security.requireSuperAdmin();
        return service.globalSummary();
    }

    @GetMapping("/global-trends")
    public List<AttendanceTrendDay> globalTrends() {
        security.requireSuperAdmin();
        return service.globalTrends();
    }

    @GetMapping("/companies-breakdown")
    public List<CompanyBreakdown> companiesBreakdown() {
        security.requireSuperAdmin();
        return service.companiesBreakdown();
    }
}
