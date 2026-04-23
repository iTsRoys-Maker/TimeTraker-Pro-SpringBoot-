package com.timetrack.controller;

import com.timetrack.dto.AuditDtos.*;
import com.timetrack.service.AuditService;
import com.timetrack.service.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService service;
    private final SecurityHelper security;

    @GetMapping("/logs")
    public AuditLogsPage list(@RequestParam(defaultValue = "1") int page,
                              @RequestParam(defaultValue = "50") int limit,
                              @RequestParam(required = false) String action) {
        return service.list(security.current(), page, limit, action);
    }
}
