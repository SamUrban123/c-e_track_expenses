import React, { useEffect, useState } from 'react';
import { configService } from '../services/ConfigService';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
    const { signOut, user } = useAuth();
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        configService.getConfig().then(setConfig);
    }, []);

    return (
        <div className="container">
            <h2>Settings</h2>

            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <h4>Account</h4>
                <p><strong>Member:</strong> {user?.memberName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <button className="btn btn-secondary" onClick={signOut}>Sign Out</button>
            </div>

            <div className="card">
                <h4>Configuration</h4>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Spreadsheet ID</label>
                    <input
                        className="input"
                        value={config?.spreadsheetId || ''}
                        onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Drive Folder ID</label>
                    <input
                        className="input"
                        value={config?.driveFolderId || ''}
                        onChange={(e) => setConfig({ ...config, driveFolderId: e.target.value })}
                    />
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={async () => {
                        try {
                            const { googleClient } = await import('../services/GoogleClient');
                            const res = await googleClient.request(`https://sheets.googleapis.com/v4/spreadsheets/${config?.spreadsheetId}`);
                            console.log('Sheet Metadata:', res);
                            const sheetNames = res.sheets?.map((s: any) => s.properties.title).join(', ');
                            alert(`Success! Connected to: "${res.properties.title}".\nTabs found: ${sheetNames}`);
                        } catch (e: any) {
                            console.error(e);
                            alert(`Connection Failed: ${e.result?.error?.message || e.message}`);
                        }
                    }}>Test Connection & Check Tabs</button>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                        Click this to verify the ID is correct and tabs exist.
                    </p>
                </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
                <h4>How to Install</h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <p><strong>iOS (Safari):</strong> Tap the Share button <span style={{ fontSize: '1.2rem' }}>⎋</span> and select "Add to Home Screen".</p>
                    <p><strong>Android (Chrome):</strong> Tap the Menu button <span style={{ fontSize: '1.2rem' }}>⋮</span> and select "Install App" or "Add to Home screen".</p>
                </div>
            </div>
        </div>
    );
};
