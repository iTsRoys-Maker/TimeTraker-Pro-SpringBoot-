package com.timetrack.controller;

import com.timetrack.dto.CompanyDtos.*;
import com.timetrack.service.CompanyService;
import com.timetrack.service.SecurityHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/companies")
@RequiredArgsConstructor
public class CompaniesController {

    private final CompanyService companyService;
    private final SecurityHelper security;

    @GetMapping
    public List<CompanyWithStats> list() {
        security.requireSuperAdmin();
        return companyService.listWithStats();
    }

    @PostMapping
    public ResponseEntity<CompanyResponse> create(@Valid @RequestBody CreateCompanyBody body) {
        security.requireSuperAdmin();
        return ResponseEntity.status(HttpStatus.CREATED).body(companyService.create(body));
    }

    @PatchMapping("/{id}")
    public CompanyResponse update(@PathVariable Integer id, @RequestBody UpdateCompanyBody body) {
        security.requireSuperAdmin();
        return companyService.update(id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        security.requireSuperAdmin();
        companyService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
