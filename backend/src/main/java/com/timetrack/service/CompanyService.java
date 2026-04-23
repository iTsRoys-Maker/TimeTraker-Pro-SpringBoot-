package com.timetrack.service;

import com.timetrack.dto.CompanyDtos.*;
import com.timetrack.entity.Company;
import com.timetrack.entity.User;
import com.timetrack.repository.CompanyRepository;
import com.timetrack.repository.EmployeeRepository;
import com.timetrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    public List<CompanyWithStats> listWithStats() {
        return companyRepository.findAll().stream().map(c -> new CompanyWithStats(
                c.getId(), c.getName(), c.getEmail(), c.getCreatedAt(),
                employeeRepository.findByCompanyId(c.getId()).size(),
                userRepository.findByCompanyId(c.getId()).stream()
                        .filter(u -> "admin".equals(u.getRole())).count()
        )).toList();
    }

    @Transactional
    public CompanyResponse create(CreateCompanyBody body) {
        Company c = Company.builder()
                .name(body.name())
                .email(body.email())
                .build();
        c = companyRepository.save(c);

        if (body.adminEmail() != null && body.adminPassword() != null) {
            User admin = User.builder()
                    .companyId(c.getId())
                    .email(body.adminEmail())
                    .name(body.adminName() != null ? body.adminName() : body.adminEmail())
                    .passwordHash(passwordEncoder.encode(body.adminPassword()))
                    .role("admin")
                    .build();
            userRepository.save(admin);
        }
        return toResponse(c);
    }

    @Transactional
    public CompanyResponse update(Integer id, UpdateCompanyBody body) {
        Company c = companyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Company not found"));
        if (body.name() != null) c.setName(body.name());
        if (body.email() != null) c.setEmail(body.email());
        return toResponse(companyRepository.save(c));
    }

    public void delete(Integer id) {
        if (!companyRepository.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Company not found");
        }
        companyRepository.deleteById(id);
    }

    public static CompanyResponse toResponse(Company c) {
        return new CompanyResponse(c.getId(), c.getName(), c.getEmail(), c.getCreatedAt());
    }
}
