package com.timetrack.service;

import com.timetrack.config.JwtAuthenticationFilter.AuthenticatedUser;
import com.timetrack.dto.AuditDtos.*;
import com.timetrack.entity.AuditLog;
import com.timetrack.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;

    public AuditLogsPage list(AuthenticatedUser current, int page, int limit, String action) {
        List<AuditLog> all = "super_admin".equals(current.role())
                ? repository.findAll(org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "timestamp"))
                : repository.findByCompanyIdOrderByTimestampDesc(current.companyId());

        List<AuditLog> filtered = action == null
                ? all
                : all.stream().filter(l -> action.equalsIgnoreCase(l.getAction())).toList();

        long total = filtered.size();
        List<AuditLogResponse> paged = filtered.stream()
                .skip((long) (page - 1) * limit)
                .limit(limit)
                .map(l -> new AuditLogResponse(
                        l.getId(), l.getCompanyId(), l.getUserId(), l.getUserEmail(),
                        l.getAction(), l.getResource(), l.getResourceId(), l.getDetails(),
                        l.getIpAddress(), l.getUserAgent(), l.getDevice(), l.getTimestamp()
                ))
                .toList();
        return new AuditLogsPage(paged, total, page, limit);
    }

    public void record(Integer companyId, Integer userId, String userEmail,
                       String action, String resource, String resourceId, String details) {
        repository.save(AuditLog.builder()
                .companyId(companyId).userId(userId).userEmail(userEmail)
                .action(action).resource(resource).resourceId(resourceId).details(details)
                .build());
    }
}
