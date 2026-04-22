import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Terminal from "@/pages/terminal";
import EmployeesList from "@/pages/employees/index";
import EmployeeDetail from "@/pages/employees/[id]";
import Reports from "@/pages/reports";
import UsersSettings from "@/pages/settings/users";
import WorkScheduleSettings from "@/pages/settings/workSchedule";
import RolesSettings from "@/pages/settings/roles";
import AuditLogs from "@/pages/settings/audit";
import Companies from "@/pages/companies";
import Profile from "@/pages/profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: true,
    },
  },
});

function AppRouter() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Terminal} />
      <Route path="/terminal" component={Terminal} />
      <Route path="/login" component={Login} />

      {/* Admin routes (under /app) */}
      <Route path="/app/dashboard">
        <ProtectedRoute component={Dashboard} allowedRoles={["super_admin", "admin"]} />
      </Route>
      <Route path="/app/profile">
        <ProtectedRoute component={Profile} allowedRoles={["super_admin", "admin", "employee"]} />
      </Route>
      <Route path="/app/companies">
        <ProtectedRoute component={Companies} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/app/employees">
        <ProtectedRoute component={EmployeesList} allowedRoles={["admin"]} />
      </Route>
      <Route path="/app/employees/:id">
        <ProtectedRoute component={EmployeeDetail} allowedRoles={["admin"]} />
      </Route>
      <Route path="/app/reports">
        <ProtectedRoute component={Reports} allowedRoles={["admin"]} />
      </Route>
      <Route path="/app/users">
        <ProtectedRoute component={UsersSettings} allowedRoles={["admin"]} />
      </Route>
      <Route path="/app/workshift">
        <ProtectedRoute component={WorkScheduleSettings} allowedRoles={["admin"]} />
      </Route>
      <Route path="/app/settings/roles">
        <ProtectedRoute component={RolesSettings} allowedRoles={["super_admin", "admin"]} />
      </Route>
      <Route path="/app/settings/audit">
        <ProtectedRoute component={AuditLogs} allowedRoles={["super_admin", "admin"]} />
      </Route>

      {/* Legacy redirects (preserve old bookmarks) */}
      <Route path="/dashboard"><Redirect to="/app/dashboard" /></Route>
      <Route path="/companies"><Redirect to="/app/companies" /></Route>
      <Route path="/employees"><Redirect to="/app/employees" /></Route>
      <Route path="/reports"><Redirect to="/app/reports" /></Route>
      <Route path="/settings/users"><Redirect to="/app/users" /></Route>
      <Route path="/settings/jornada"><Redirect to="/app/workshift" /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <AppRouter />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
