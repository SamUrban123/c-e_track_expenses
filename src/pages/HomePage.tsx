import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDB } from '../db/db';

export const HomePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [queueCount, setQueueCount] = useState(0);

    useEffect(() => {
        const checkQueue = async () => {
            const db = await getDB();
            const count = await db.count('queue');
            setQueueCount(count);
        };
        checkQueue();
        // Poll or use listener in real app
        const interval = setInterval(checkQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container">
            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ marginBottom: '0' }}>Hello, {user?.memberName} 👋</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </header>

            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div className="card" onClick={() => navigate('/capture')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📷</div>
                    <div style={{ fontWeight: '500' }}>Scan Receipt</div>
                </div>
                <div className="card" onClick={() => navigate('/capture?mode=import')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📂</div>
                    <div style={{ fontWeight: '500' }}>Import PDF</div>
                </div>
            </section>

            {queueCount > 0 && (
                <div className="card" style={{ backgroundColor: 'var(--warning-surface, #ffffb0)', marginBottom: 'var(--space-6)' }}>
                    <strong>⚠️ Sync Pending</strong>
                    <p style={{ margin: 0 }}>{queueCount} items waiting to upload.</p>
                </div>
            )}

            <h3>Recent Activity</h3>
            <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No recent activity loaded.
                {/* We will implement history loading later */}
            </div>
        </div>
    );
};
