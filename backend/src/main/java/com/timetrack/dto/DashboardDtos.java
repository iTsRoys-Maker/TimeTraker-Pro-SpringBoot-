package com.timetrack.dto;

public class DashboardDtos {

    public record DashboardSummary(
            long totalEmployees, long activeToday,
            long checkInsToday, long checkOutsToday, long absentToday
    ) {}

    public record AttendanceTrendDay(String date, long checkIns, long checkOuts) {}

    public record GlobalSummary(
            long totalCompanies, long totalEmployees,
            long checkInsToday, long checkOutsToday, long activeCompaniesToday
    ) {}

    public record CompanyBreakdown(
            Integer companyId, String companyName,
            long employees, long checkInsToday, long checkOutsToday
    ) {}
}
