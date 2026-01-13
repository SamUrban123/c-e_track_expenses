import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sheetService } from '../services/SheetService';
import { googleClient } from '../services/GoogleClient';
import { configService } from '../services/ConfigService';

export const HistoryPage: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Logic
    // Ideally this works by reading the sheet values and mapping them using SheetService.colMap

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const config = await configService.getConfig();
                const sheetId = config.spreadsheetId;
                const headersMap = await sheetService.fetchHeaders();

                // Read reasonable range (last 100 rows?)
                // Or read all.
                const res = await googleClient.request(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Transactions (1065)!A2:Z1000`);
                const rows = res.values || [];

                // Map rows to objects
                const parsed = rows.map((row: string[]) => {
                    // Safe access using optional chaining in case row is short
                    return {
                        date: row[headersMap.Date] || '',
                        vendor: row[headersMap.Vendor] || '',
                        amount: row[headersMap.Amount] || '',
                        category: row[headersMap.Category] || '',
                        status: headersMap.Status !== undefined ? row[headersMap.Status] : 'Active',
                        id: headersMap.ExpenseId !== undefined ? row[headersMap.ExpenseId] : ''
                    };
                }).filter((i: any) => i.status !== 'Deleted').reverse(); // Show newest first? Sheets appends to bottom.

                setItems(parsed);
            } catch (e) {
                console.error('History Fetch Error', e);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchHistory();
    }, [user]);

    return (
        <div className="container">
            <h2>History</h2>
            {loading ? <p>Loading...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {items.map((item, idx) => (
                        <div key={item.id || idx} className="card" style={{ padding: 'var(--space-3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong style={{ fontSize: 'var(--font-size-lg)' }}>{item.vendor}</strong>
                                <span style={{ fontWeight: '600' }}>${item.amount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                <span>{item.date}</span>
                                <span>{item.category}</span>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No receipts found.</p>}
                </div>
            )}
        </div>
    );
};
