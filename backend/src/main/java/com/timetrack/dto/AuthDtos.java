package com.timetrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;

public class AuthDtos {

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record UserProfile(
            Integer id,
            String email,
            String name,
            String role,
            Integer companyId,
            OffsetDateTime createdAt
    ) {}

    public record AuthResponse(String token, UserProfile user) {}
}
