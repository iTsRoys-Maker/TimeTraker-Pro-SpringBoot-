package com.timetrack.controller;

import com.timetrack.dto.WorkScheduleDtos.*;
import com.timetrack.service.SecurityHelper;
import com.timetrack.service.WorkScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/work-schedule")
@RequiredArgsConstructor
public class WorkScheduleController {

    private final WorkScheduleService service;
    private final SecurityHelper security;

    @GetMapping
    public WorkScheduleResponse get() {
        return service.get(security.requireCompanyId());
    }

    @PutMapping
    public WorkScheduleResponse update(@Valid @RequestBody UpdateWorkScheduleBody body) {
        return service.update(security.requireCompanyId(), body);
    }
}
