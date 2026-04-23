package com.timetrack.service;

import com.timetrack.config.JwtAuthenticationFilter.AuthenticatedUser;
import com.timetrack.dto.UserDtos.*;
import com.timetrack.entity.User;
import com.timetrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserSummary> list(AuthenticatedUser current) {
        List<User> users = "super_admin".equals(current.role())
                ? userRepository.findAll()
                : userRepository.findByCompanyId(current.companyId());
        return users.stream().map(UserService::toSummary).toList();
    }

    public UserSummary create(AuthenticatedUser current, CreateUserBody body) {
        Integer companyId = "super_admin".equals(current.role()) ? null : current.companyId();
        User u = User.builder()
                .companyId(companyId)
                .email(body.email())
                .name(body.name())
                .role(body.role())
                .passwordHash(passwordEncoder.encode(body.password()))
                .build();
        return toSummary(userRepository.save(u));
    }

    public void delete(AuthenticatedUser current, Integer id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        if (!"super_admin".equals(current.role())
                && (u.getCompanyId() == null || !u.getCompanyId().equals(current.companyId()))) {
            throw new ResponseStatusException(NOT_FOUND, "User not found");
        }
        userRepository.delete(u);
    }

    public static UserSummary toSummary(User u) {
        return new UserSummary(u.getId(), u.getEmail(), u.getName(), u.getRole(),
                u.getCompanyId(), u.getCreatedAt());
    }
}
