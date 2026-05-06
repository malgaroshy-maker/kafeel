import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import OfficeLayout from './layouts/OfficeLayout';
import AdminLayout from './layouts/AdminLayout';
import MonitorLayout from './layouts/MonitorLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/office/*" element={<OfficeLayout />} />
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="/monitor/*" element={<MonitorLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
