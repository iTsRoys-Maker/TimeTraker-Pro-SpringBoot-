package com.timetrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class WorkScheduleDtos {

    public record WorkScheduleResponse(
            Integer id, Integer companyId,
            String startTime, String endTime,
            List<String> workDays, Integer lateToleranceMinutes
    ) {}

    public record UpdateWorkScheduleBody(
            @NotBlank String startTime,
            @NotBlank String endTime,
            @NotEmpty List<String> workDays,
            Integer lateToleranceMinutes
    ) {}
}
