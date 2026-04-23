package com.timetrack.service;

import com.timetrack.config.JwtAuthenticationFilter.AuthenticatedUser;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Component
public class SecurityHelper {

    public AuthenticatedUser current() {
        Object p = SecurityContextHolder.getContext().getAuthentication() == null
                ? null : SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(p instanceof AuthenticatedUser u)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Unauthorized");
        }
        return u;
    }

    public void requireSuperAdmin() {
        if (!"super_admin".equals(current().role())) {
            throw new ResponseStatusException(FORBIDDEN, "super_admin only");
        }
    }

    public Integer requireCompanyId() {
        Integer cid = current().companyId();
        if (cid == null) {
            throw new ResponseStatusException(FORBIDDEN, "No company associated to user");
        }
        return cid;
    }
}
