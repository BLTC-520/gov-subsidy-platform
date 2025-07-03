import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import CitizenProfilePage from './pages/CitizenProfilePage';
import CitizenClaimPage from './pages/CitizenClaimPage';
import FileUploadPage from './pages/FileUploadPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin/file-upload" element={<FileUploadPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/citizen" element={<CitizenProfilePage />} />
        <Route path="/citizen/profile" element={<CitizenProfilePage />} />
        <Route path="/citizen/claim" element={<CitizenClaimPage />} />
      </Routes>
    </Router>
  );
}

export default App;
