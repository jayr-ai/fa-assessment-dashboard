import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Overview } from './pages/Overview';
import { Login } from './pages/Login';
import { MyAssessment } from './pages/MyAssessment';
import './App.css';

function App() {
  return (
    // HashRouter, not BrowserRouter: GitHub Pages serves static files with no server-side
    // rewrite, so a direct load of /my-assessment would 404. Hash routes (/#/my-assessment)
    // never hit the server for the route itself.
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-assessment" element={<MyAssessment />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
