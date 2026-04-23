package com.timetrack.dto;

import java.time.OffsetDateTime;
import java.util.List;

public class AuditDtos {

    public record AuditLogResponse(
            Integer id, Integer companyId, Integer userId, String userEmail,
            String action, String resource, String resourceId, String details,
            String ipAddress, String userAgent, String device,
            OffsetDateTime timestamp
    ) {}

    public record AuditLogsPage(List<AuditLogResponse> logs, long total, int page, int limit) {}
}
