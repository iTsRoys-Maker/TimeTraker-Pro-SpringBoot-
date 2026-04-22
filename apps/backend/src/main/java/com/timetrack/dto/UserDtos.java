package com.timetrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public class UserDtos {

    public record UserSummary(
            Integer id, String email, String name, String role,
            Integer companyId, OffsetDateTime createdAt
    ) {}

    public record CreateUserBody(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 6) String password,
            @NotBlank String name,
            @NotBlank String role
    ) {}
}
