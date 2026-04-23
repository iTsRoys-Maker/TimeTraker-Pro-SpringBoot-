package com.timetrack.service;

import com.timetrack.entity.AttendanceLog;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

public final class AttendanceMath {
    private AttendanceMath() {}

    /**
     * Calcula horas trabajadas pareando check_in / check_out cronológicos.
     * Si queda un check_in abierto, se ignora (no se suma hasta haber check_out).
     */
    public static double workedHours(List<AttendanceLog> logs) {
        List<AttendanceLog> ordered = logs.stream()
                .sorted(Comparator.comparing(AttendanceLog::getTimestamp))
                .toList();
        long seconds = 0;
        OffsetDateTime openIn = null;
        for (AttendanceLog l : ordered) {
            if ("check_in".equals(l.getType())) {
                openIn = l.getTimestamp();
            } else if ("check_out".equals(l.getType()) && openIn != null) {
                seconds += Duration.between(openIn, l.getTimestamp()).getSeconds();
                openIn = null;
            }
        }
        return Math.max(0, seconds / 3600.0);
    }

    public static double extraHours(double worked) {
        return Math.max(0, worked - 8.0);
    }
}
