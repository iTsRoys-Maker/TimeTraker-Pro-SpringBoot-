package com.timetrack.controller;

import com.timetrack.dto.EmployeeDtos.*;
import com.timetrack.service.EmployeeService;
import com.timetrack.service.SecurityHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/employees")
@RequiredArgsConstructor
public class EmployeesController {

    private final EmployeeService employeeService;
    private final SecurityHelper security;

    @GetMapping
    public List<EmployeeResponse> list(@RequestParam(required = false) String search,
                                       @RequestParam(required = false) String status) {
        return employeeService.list(security.requireCompanyId(), search, status);
    }

    @GetMapping("/status")
    public List<EmployeeWithStatus> status() {
        return employeeService.listStatus(security.requireCompanyId());
    }

    @GetMapping("/profile/{document}")
    public EmployeeProfile profile(@PathVariable String document) {
        var u = security.current();
        Integer scope = "super_admin".equals(u.role()) ? null : u.companyId();
        return employeeService.getProfileByDocument(scope, document);
    }

    @GetMapping("/{id}")
    public EmployeeResponse get(@PathVariable Integer id) {
        return employeeService.get(security.requireCompanyId(), id);
    }

    @PostMapping
    public ResponseEntity<EmployeeResponse> create(@Valid @RequestBody CreateEmployeeBody body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(employeeService.create(security.requireCompanyId(), body));
    }

    @PatchMapping("/{id}")
    public EmployeeResponse update(@PathVariable Integer id, @RequestBody UpdateEmployeeBody body) {
        return employeeService.update(security.requireCompanyId(), id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        employeeService.delete(security.requireCompanyId(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/pin")
    public EmployeeResponse setPin(@PathVariable Integer id, @Valid @RequestBody SetPinBody body) {
        return employeeService.setPin(security.requireCompanyId(), id, body.pin());
    }
}
