import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Main Dashboard
import Dashboard from './pages/Dashboard';
import CostOptimizer from './components/CostOptimizer';
// Service Dashboards
import EC2Dashboard from './pages/EC2Dashboard';
import S3Dashboard from './pages/S3Dashboard';
import RDSDashboard from './pages/RDSDashboard';
import LambdaDashboard from './pages/LambdaDashboard';
import EBSDashboard from './pages/EBSDashboard';


// Alert Pages
import Alerts from './pages/Alerts';
import CreateAlert from './pages/CreateAlert';

// Settings (placeholder for now)
import Settings from './pages/Settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUserId = localStorage.getItem('userId');
    const storedAuth = localStorage.getItem('isAuthenticated');
    
    if (storedUserId && storedAuth === 'true') {
      setIsAuthenticated(true);
      setUserId(storedUserId);
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userId, username, email, region) => {
    setIsAuthenticated(true);
    setUserId(userId);
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    localStorage.setItem('email', email);
    localStorage.setItem('region', region);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserId(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('region');
    localStorage.removeItem('isAuthenticated');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading CloudOps... </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to="/dashboard" />
            )
          } 
        />
        <Route 
          path="/register" 
          element={
            !isAuthenticated ? (
              <Register onRegister={handleLogin} />
            ) : (
              <Navigate to="/dashboard" />
            )
          } 
        />

        {/* Protected Routes - Main Dashboard */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard 
                userId={userId} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route 
          path="/cost-optimizer" 
          element={
            isAuthenticated ? 
            <CostOptimizer userId={userId} /> : 
            <Navigate to="/login" />
          } 
        />

        {/* Protected Routes - Service Dashboards */}
        <Route
          path="/ec2"
          element={
            isAuthenticated ? (
              <EC2Dashboard 
                userId={userId} 
                initialRegion={localStorage.getItem('region')}
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/s3"
          element={
            isAuthenticated ? (
              <S3Dashboard 
                userId={userId} 
                initialRegion={localStorage.getItem('region')}
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/rds"
          element={
            isAuthenticated ? (
              <RDSDashboard 
                userId={userId} 
                initialRegion={localStorage.getItem('region')}
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/lambda"
          element={
            isAuthenticated ? (
              <LambdaDashboard 
                userId={userId} 
                initialRegion={localStorage.getItem('region')}
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/ebs"
          element={
            isAuthenticated ? (
              <EBSDashboard 
                userId={userId} 
                initialRegion={localStorage.getItem('region')}
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Protected Routes - Alert Management */}
        <Route
          path="/alerts"
          element={
            isAuthenticated ? (
              <Alerts 
                userId={userId} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/alerts/create"
          element={
            isAuthenticated ? (
              <CreateAlert 
                userId={userId} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/alerts/edit/:alertId"
          element={
            isAuthenticated ? (
              <CreateAlert 
                userId={userId} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Protected Routes - Settings */}
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <Settings 
                userId={userId} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Default Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ?  (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* 404 Not Found */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">Page Not Found</p>
                <a 
                  href="/dashboard" 
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;