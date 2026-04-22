package com.timetrack.controller;

import com.timetrack.dto.UserDtos.*;
import com.timetrack.service.SecurityHelper;
import com.timetrack.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UsersController {

    private final UserService userService;
    private final SecurityHelper security;

    @GetMapping
    public List<UserSummary> list() {
        return userService.list(security.current());
    }

    @PostMapping
    public ResponseEntity<UserSummary> create(@Valid @RequestBody CreateUserBody body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(security.current(), body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        userService.delete(security.current(), id);
        return ResponseEntity.noContent().build();
    }
}
