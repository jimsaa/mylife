import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ADMIN_BASE } from './lib/constants';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { TimeTrackingPage } from './pages/TimeTrackingPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { JournalPage } from './pages/JournalPage';
import { WellbeingPage } from './pages/WellbeingPage';
import { SleepPage } from './pages/SleepPage';
import { FoodPage } from './pages/FoodPage';
import { TaxiPage } from './pages/TaxiPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeslaViewPage } from './pages/TeslaViewPage';
import { LandingPage } from './pages/LandingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path={`${ADMIN_BASE}/tesla`} element={<TeslaViewPage />} />
        <Route path={ADMIN_BASE} element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="kalender" element={<CalendarPage />} />
          <Route path="tid" element={<TimeTrackingPage />} />
          <Route path="projekt" element={<ProjectsPage />} />
          <Route path="statistik" element={<StatisticsPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="valbefinnande" element={<WellbeingPage />} />
          <Route path="somn" element={<SleepPage />} />
          <Route path="mat" element={<FoodPage />} />
          <Route path="taxi" element={<TaxiPage />} />
          <Route path="mal" element={<GoalsPage />} />
          <Route path="installningar" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to={ADMIN_BASE} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
