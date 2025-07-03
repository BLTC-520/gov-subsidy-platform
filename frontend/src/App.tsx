import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import CitizenProfilePage from './pages/CitizenProfilePage';
import CitizenClaimPage from './pages/CitizenClaimPage';
import FileUploadPage from './pages/FileUploadPage';
import { RouteGuard } from './components/auth/RouteGuard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin/file-upload" element={
          <RouteGuard requiredRole="admin">
            <FileUploadPage />
          </RouteGuard>
        } />
        <Route path="/admin" element={
          <RouteGuard requiredRole="admin">
            <Admin />
          </RouteGuard>
        } />
        <Route path="/citizen" element={
          <RouteGuard requiredRole="citizen">
            <CitizenProfilePage />
          </RouteGuard>
        } />
        <Route path="/citizen/profile" element={
          <RouteGuard requiredRole="citizen">
            <CitizenProfilePage />
          </RouteGuard>
        } />
        <Route path="/citizen/claim" element={
          <RouteGuard requiredRole="citizen">
            <CitizenClaimPage />
          </RouteGuard>
        } />
      </Routes>
    </Router>
  );
}

export default App;
