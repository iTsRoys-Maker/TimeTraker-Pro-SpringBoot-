package com.timetrack.config;

import com.timetrack.entity.User;
import com.timetrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InitialDataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.super-admin-email:admin@timetrack.local}")
    private String email;

    @Value("${app.bootstrap.super-admin-password:Admin#12345}")
    private String password;

    @Value("${app.bootstrap.super-admin-name:Super Admin}")
    private String name;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;
        User u = User.builder()
                .email(email)
                .name(name)
                .role("super_admin")
                .companyId(null)
                .passwordHash(passwordEncoder.encode(password))
                .build();
        userRepository.save(u);
        log.warn("Bootstrapped initial super_admin user: {} (cambia la contraseña ya)", email);
    }
}
