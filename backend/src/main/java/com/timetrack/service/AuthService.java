package com.timetrack.service;

import com.timetrack.config.JwtUtil;
import com.timetrack.dto.AuthDtos;
import com.timetrack.entity.User;
import com.timetrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), user.getCompanyId());
        return new AuthDtos.AuthResponse(token, toProfile(user));
    }

    public AuthDtos.UserProfile toProfile(User u) {
        return new AuthDtos.UserProfile(
                u.getId(),
                u.getEmail(),
                u.getName(),
                u.getRole(),
                u.getCompanyId(),
                u.getCreatedAt()
        );
    }
}
