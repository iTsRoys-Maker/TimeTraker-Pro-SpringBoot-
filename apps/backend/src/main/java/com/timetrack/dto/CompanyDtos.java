package com.timetrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;

public class CompanyDtos {

    public record CompanyResponse(Integer id, String name, String email, OffsetDateTime createdAt) {}

    public record CompanyWithStats(
            Integer id, String name, String email, OffsetDateTime createdAt,
            long employeeCount, long adminCount
    ) {}

    public record CreateCompanyBody(
            @NotBlank String name,
            @Email @NotBlank String email,
            String adminName,
            String adminEmail,
            String adminPassword
    ) {}

    public record UpdateCompanyBody(String name, String email) {}
}
