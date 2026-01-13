import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
    const { user, signIn, error } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', textAlign: 'center' }}>
                <h1>Receipt Tracker</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                    Sign in to manage expenses.
                </p>

                {error && (
                    <div style={{
                        backgroundColor: 'var(--danger-surface)',
                        color: 'var(--danger)',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)'
                    }}>
                        {error}
                    </div>
                )}

                <button className="btn" onClick={signIn}>
                    Sign in with Google
                </button>

                <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#666' }}>
                    Having trouble?
                    <button onClick={async () => {
                        const db = await import('../db/db').then(m => m.getDB());
                        await db.clear('config');
                        window.location.reload();
                    }} style={{ background: 'none', border: 'none', textDecoration: 'underline', color: 'red', cursor: 'pointer', marginLeft: '0.5rem' }}>
                        Reset Configuration
                    </button>
                </p>
            </div>
        </div>
    );
};
