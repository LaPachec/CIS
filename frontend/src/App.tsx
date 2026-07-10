import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CompetitionsPage } from './routes/CompetitionsPage'
import { CompetitorsPage } from './routes/CompetitorsPage'
import { Dashboard } from './routes/Dashboard'
import { ExpertsPage } from './routes/ExpertsPage'
import { MarkingPage } from './routes/MarkingPage'
import { ModulesPage } from './routes/ModulesPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="competitions" element={<CompetitionsPage />} />
        <Route path="competitors" element={<CompetitorsPage />} />
        <Route path="experts" element={<ExpertsPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="marking" element={<MarkingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
