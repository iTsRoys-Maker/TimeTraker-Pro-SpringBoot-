package com.timetrack.service;

import com.timetrack.dto.WorkScheduleDtos.*;
import com.timetrack.entity.WorkSchedule;
import com.timetrack.repository.WorkScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkScheduleService {

    private final WorkScheduleRepository repository;

    public WorkScheduleResponse get(Integer companyId) {
        WorkSchedule ws = repository.findByCompanyId(companyId).orElseGet(() -> {
            WorkSchedule fresh = WorkSchedule.builder()
                    .companyId(companyId)
                    .startTime("08:00").endTime("17:00")
                    .workDays(List.of("mon", "tue", "wed", "thu", "fri"))
                    .lateToleranceMinutes(15)
                    .build();
            return repository.save(fresh);
        });
        return toResponse(ws);
    }

    public WorkScheduleResponse update(Integer companyId, UpdateWorkScheduleBody body) {
        WorkSchedule ws = repository.findByCompanyId(companyId).orElseGet(() ->
                WorkSchedule.builder().companyId(companyId).build());
        ws.setStartTime(body.startTime());
        ws.setEndTime(body.endTime());
        ws.setWorkDays(body.workDays());
        if (body.lateToleranceMinutes() != null) ws.setLateToleranceMinutes(body.lateToleranceMinutes());
        else if (ws.getLateToleranceMinutes() == null) ws.setLateToleranceMinutes(15);
        return toResponse(repository.save(ws));
    }

    public static WorkScheduleResponse toResponse(WorkSchedule ws) {
        return new WorkScheduleResponse(ws.getId(), ws.getCompanyId(),
                ws.getStartTime(), ws.getEndTime(), ws.getWorkDays(), ws.getLateToleranceMinutes());
    }
}
