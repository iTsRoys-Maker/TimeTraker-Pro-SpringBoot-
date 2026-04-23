package com.timetrack.config;

import com.timetrack.entity.*;
import com.timetrack.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InitialDataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final AttendanceLogRepository attendanceLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.super-admin-email:admin@timetrack.local}")
    private String superEmail;

    @Value("${app.bootstrap.super-admin-password:Admin#12345}")
    private String superPassword;

    @Value("${app.bootstrap.super-admin-name:Super Admin}")
    private String superName;

    @Value("${app.bootstrap.seed-demo:true}")
    private boolean seedDemo;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Users table not empty - skipping bootstrap");
            return;
        }

        // 1) Super admin (sin empresa)
        userRepository.save(User.builder()
                .email(superEmail)
                .name(superName)
                .role("super_admin")
                .companyId(null)
                .passwordHash(passwordEncoder.encode(superPassword))
                .build());
        log.warn("Bootstrapped super_admin: {} (cambia la contrasena ya)", superEmail);

        if (!seedDemo) return;

        // 2) Dos empresas demo
        Company acme = companyRepository.save(Company.builder()
                .name("ACME Corp")
                .email("contact@acme.local")
                .build());

        Company globex = companyRepository.save(Company.builder()
                .name("Globex S.A.")
                .email("contact@globex.local")
                .build());

        // 3) Admin por empresa
        userRepository.save(User.builder()
                .email("admin@acme.local")
                .name("Admin ACME")
                .role("admin")
                .companyId(acme.getId())
                .passwordHash(passwordEncoder.encode("Admin#12345"))
                .build());

        userRepository.save(User.builder()
                .email("admin@globex.local")
                .name("Admin Globex")
                .role("admin")
                .companyId(globex.getId())
                .passwordHash(passwordEncoder.encode("Admin#12345"))
                .build());

        // 4) Horarios laborales por empresa
        workScheduleRepository.save(WorkSchedule.builder()
                .companyId(acme.getId())
                .startTime("08:00").endTime("17:00")
                .workDays(List.of("mon", "tue", "wed", "thu", "fri"))
                .lateToleranceMinutes(15)
                .build());

        workScheduleRepository.save(WorkSchedule.builder()
                .companyId(globex.getId())
                .startTime("09:00").endTime("18:00")
                .workDays(List.of("mon", "tue", "wed", "thu", "fri"))
                .lateToleranceMinutes(10)
                .build());

        // 5) Empleados demo
        Employee e1 = employeeRepository.save(buildEmployee(acme.getId(),
                "12345678", "Maria Lopez", "Desarrolladora", "Tecnologia",
                "maria.lopez@acme.local", "3001112233"));
        Employee e2 = employeeRepository.save(buildEmployee(acme.getId(),
                "23456789", "Carlos Ruiz", "Disenador", "Tecnologia",
                "carlos.ruiz@acme.local", "3002223344"));
        Employee e3 = employeeRepository.save(buildEmployee(acme.getId(),
                "34567890", "Ana Torres", "Contadora", "Finanzas",
                "ana.torres@acme.local", "3003334455"));
        Employee e4 = employeeRepository.save(buildEmployee(acme.getId(),
                "45678901", "Pedro Gomez", "Vendedor", "Ventas",
                "pedro.gomez@acme.local", "3004445566"));

        Employee g1 = employeeRepository.save(buildEmployee(globex.getId(),
                "56789012", "Laura Diaz", "Gerente", "Operaciones",
                "laura.diaz@globex.local", "3005556677"));
        Employee g2 = employeeRepository.save(buildEmployee(globex.getId(),
                "67890123", "Jorge Vargas", "Analista", "Operaciones",
                "jorge.vargas@globex.local", "3006667788"));

        // 6) Asistencias de hoy
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime morning = now.withHour(8).withMinute(5).withSecond(0).withNano(0);
        OffsetDateTime morningLate = now.withHour(8).withMinute(45).withSecond(0).withNano(0);
        OffsetDateTime evening = now.withHour(17).withMinute(10).withSecond(0).withNano(0);

        // ACME: 3 con check_in, 1 ya con check_out
        attendanceLogRepository.save(log(acme.getId(), e1.getId(), "check_in", morning));
        attendanceLogRepository.save(log(acme.getId(), e2.getId(), "check_in", morning.plusMinutes(7)));
        attendanceLogRepository.save(log(acme.getId(), e3.getId(), "check_in", morningLate));
        attendanceLogRepository.save(log(acme.getId(), e1.getId(), "check_out", evening));

        // Globex: 1 con check_in
        attendanceLogRepository.save(log(globex.getId(), g1.getId(), "check_in",
                morning.withHour(9).withMinute(2)));

        log.info("Seed demo creado: 2 empresas, 2 admins, 6 empleados, 5 marcaciones");
        log.info("Logins demo => admin@acme.local / admin@globex.local  (Admin#12345)");
    }

    private Employee buildEmployee(Integer companyId, String doc, String name,
                                   String position, String department,
                                   String email, String phone) {
        return Employee.builder()
                .companyId(companyId)
                .documentNumber(doc)
                .name(name)
                .position(position)
                .department(department)
                .status("active")
                .email(email)
                .phone(phone)
                .pinHash(passwordEncoder.encode("1234"))
                .build();
    }

    private AttendanceLog log(Integer companyId, Integer employeeId,
                              String type, OffsetDateTime ts) {
        return AttendanceLog.builder()
                .companyId(companyId)
                .employeeId(employeeId)
                .type(type)
                .timestamp(ts)
                .build();
    }
}
