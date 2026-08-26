import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDashboardPage } from './pages/projects/ProjectDashboardPage';
import { WorkspacesPage } from './pages/workspaces/WorkspacesPage';
import { NotFoundPage } from './pages/not-found/NotFoundPage';

// Phase 1: Manual Testing Pages
import { ManualTestingLayout } from './pages/manual-testing/ManualTestingLayout';
import { TestCasesPage } from './pages/manual-testing/TestCasesPage';
import { TestCaseDetailPage } from './pages/manual-testing/TestCaseDetailPage';
import { TestSuitesPage } from './pages/manual-testing/TestSuitesPage';
import { TestRunsPage } from './pages/manual-testing/TestRunsPage';
import { TestRunnerWorkstation } from './pages/manual-testing/TestRunnerWorkstation';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
        }}
      >
        Initializing Lumen Workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <WorkspaceProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* Onboarding Flow */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Workspace & Project Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/projects" replace />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectDashboardPage />} />

              {/* Phase 1: Manual Testing Sub-routes */}
              <Route path="projects/:projectId/manual" element={<ManualTestingLayout />}>
                <Route index element={<Navigate to="cases" replace />} />
                <Route path="cases" element={<TestCasesPage />} />
                <Route path="cases/:caseId" element={<TestCaseDetailPage />} />
                <Route path="suites" element={<TestSuitesPage />} />
                <Route path="runs" element={<TestRunsPage />} />
              </Route>
              
              {/* Focused Execution Workstation */}
              <Route path="projects/:projectId/manual/runs/:runId/execute" element={<TestRunnerWorkstation />} />

              <Route path="workspaces" element={<WorkspacesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
