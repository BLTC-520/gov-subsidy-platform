import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import Citizen from './pages/Citizen';
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
        <Route path="/citizen" element={<Citizen />} />
      </Routes>
    </Router>
  );
}

export default App;
