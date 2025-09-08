import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Admin from "./pages/Admin";
import SettingsPage from "./pages/SettingsPage";
import CitizenListPage from "./pages/CitizenListPage";
import CitizenProfilePage from "./pages/CitizenProfilePage";
import ProfilePage from "./pages/ProfilePage";
import CitizenClaimPage from "./pages/CitizenClaimPage";
import FileUploadPage from "./pages/FileUploadPage";
import ZKDemoPage from "./pages/ZKDemoPage";
import { RouteGuard } from "./components/auth/RouteGuard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/admin/file-upload"
          element={
            <RouteGuard requiredRole="admin">
              <FileUploadPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <RouteGuard requiredRole="admin">
              <Admin />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RouteGuard requiredRole="admin">
              <SettingsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/citizens"
          element={
            <RouteGuard requiredRole="admin">
              <CitizenListPage />
            </RouteGuard>
          }
        />
        <Route
          path="/citizen"
          element={
            <RouteGuard requiredRole="citizen">
              <CitizenProfilePage />
            </RouteGuard>
          }
        />
        <Route
          path="/citizen/profile"
          element={
            <RouteGuard requiredRole="citizen">
              <ProfilePage />
            </RouteGuard>
          }
        />
        <Route
          path="/citizen/claim"
          element={
            <RouteGuard requiredRole="citizen">
              <CitizenClaimPage />
            </RouteGuard>
          }
        />
        <Route
          path="/citizen/zk-demo"
          element={
            <RouteGuard requiredRole="citizen">
              <ZKDemoPage />
            </RouteGuard>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
