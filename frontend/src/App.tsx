import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import { ThemeTogglePortal } from "./components/theme/ThemeTogglePortal";
import { ActiveUserProvider } from "./contexts/ActiveUserContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BackupPage } from "./routes/BackupPage";
import { CheckPage } from "./routes/CheckPage";
import { CompetitionsPage } from "./routes/CompetitionsPage";
import { CompetitorsPage } from "./routes/CompetitorsPage";
import { Dashboard } from "./routes/Dashboard";
import { ExpertsPage } from "./routes/ExpertsPage";
import { FinalCheckPage } from "./routes/FinalCheckPage";
import { ImportPage } from "./routes/ImportPage";
import { LoginPage } from "./routes/LoginPage";
import { MarkingPage } from "./routes/MarkingPage";
import { ModuleClosingPage } from "./routes/ModuleClosingPage";
import { ModulesPage } from "./routes/ModulesPage";
import { ResultsPage } from "./routes/ResultsPage";

function App() {
  return (
    <BrowserRouter basename="/">
      <ThemeProvider>
        <ThemeTogglePortal />
        <ActiveUserProvider>
          <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route
                path="competitions"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <CompetitionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="competitors"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <CompetitorsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="experts"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <ExpertsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="modules"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <ModulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="import"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <ImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="marking"
                element={
                  <ProtectedRoute roles={["ADMIN", "SUPERVISOR", "EXPERT"]}>
                    <MarkingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="checks"
                element={
                  <ProtectedRoute roles={["ADMIN", "SUPERVISOR", "EXPERT"]}>
                    <CheckPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="final-check"
                element={
                  <ProtectedRoute roles={["ADMIN", "SUPERVISOR", "VIEWER"]}>
                    <FinalCheckPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="module-closing"
                element={
                  <ProtectedRoute roles={["ADMIN", "SUPERVISOR"]}>
                    <ModuleClosingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="results"
                element={
                  <ProtectedRoute roles={["ADMIN", "SUPERVISOR", "VIEWER"]}>
                    <ResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="backup"
                element={
                  <ProtectedRoute roles={["ADMIN", "SUPERVISOR"]}>
                    <BackupPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
          </Routes>
        </ActiveUserProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
