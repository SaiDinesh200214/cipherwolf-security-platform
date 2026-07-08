import { useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Projects from "./pages/Projects";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import { ToastProvider } from "./components/common/ToastProvider";
import SplashScreen from "./components/common/SplashScreen";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { requestVisitorLocation, trackVisitorEvent } from "./services/visitorTracking";

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const location = useLocation();
  const firstRouteTracked = useRef(false);

  const handleSplashComplete = () => {
    setSplashDone(true);
  };

  useEffect(() => {
    requestVisitorLocation();
  }, []);

  useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");
    trackVisitorEvent(firstRouteTracked.current ? "page_view" : "session_start", {
      area: isAdmin ? "admin" : "public",
      route: location.pathname,
      search: location.search,
      fullPath: `${location.pathname}${location.search}`,
    });
    if (isAdmin) {
      trackVisitorEvent("admin_page_view", {
        area: "admin",
        route: location.pathname,
        search: location.search,
        fullPath: `${location.pathname}${location.search}`,
      });
    }
    firstRouteTracked.current = true;
  }, [location.pathname, location.search]);

  return (
    <ToastProvider>
      {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/about" element={<Layout><About /></Layout>} />
        <Route path="/projects" element={<Layout><Projects /></Layout>} />
        <Route path="/*" element={<Layout><Home /></Layout>} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
