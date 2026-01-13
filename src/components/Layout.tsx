import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../hooks/useSync';
import './Layout.css'; // We'll create this specific CSS

export const Layout: React.FC = () => {
    const { user } = useAuth();
    useSync(); // Background Sync

    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="app-layout">
            <main className="app-content">
                <Outlet />
            </main>

            <nav className="bottom-nav">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span>🏠</span>
                    <span className="nav-label">Home</span>
                </NavLink>
                <NavLink to="/capture" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <div className="capture-fab">📸</div>
                </NavLink>
                <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span>📜</span>
                    <span className="nav-label">History</span>
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span>⚙️</span>
                    <span className="nav-label">Settings</span>
                </NavLink>
            </nav>
        </div>
    );
};
