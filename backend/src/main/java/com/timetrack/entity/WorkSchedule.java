package com.timetrack.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "work_schedule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "company_id")
    private Integer companyId;

    @Column(name = "start_time", nullable = false)
    private String startTime;

    @Column(name = "end_time", nullable = false)
    private String endTime;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "work_days", nullable = false, columnDefinition = "text[]")
    private List<String> workDays;

    @Column(name = "late_tolerance_minutes", nullable = false)
    private Integer lateToleranceMinutes;
}
