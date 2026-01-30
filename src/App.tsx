import { useAuth } from './contexts/AuthContext';
import { useState, useEffect } from 'react';
import './index.css';
import { ExpenseForm, type ExpenseType } from './components/ExpenseForm';
import { SheetService } from './services/SheetService';
import { DriveService } from './services/DriveService';

function App() {
  const { user, login, logout, isLoading } = useAuth();

  // Tabs: 'schedule-c' | 'schedule-e' | 'schedule-a' | 'diagnostics'
  const [activeTab, setActiveTab] = useState<string>('schedule-c');

  const [diagnostics, setDiagnostics] = useState<{
    count: number;
    first10: string[];
    last10: string[];
    stopReason: string;
    stopIndex: number;
    categories: string[];
  } | null>(null);

  const [lists, setLists] = useState<{ vendors: string[], properties: string[] }>({ vendors: [], properties: [] });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          const sheetService = new SheetService(user.accessToken);

          // Parallel load
          const [diagResult, listResult] = await Promise.all([
            sheetService.getCategories(),
            sheetService.getLists()
          ]);

          setDiagnostics({
            count: diagResult.categories.length,
            first10: diagResult.categories.slice(0, 10),
            last10: diagResult.categories.slice(-10),
            stopReason: diagResult.stopReason,
            stopIndex: diagResult.stopIndex,
            categories: diagResult.categories
          });

          setLists(listResult);

        } catch (e: any) {
          console.error("Data load failed", e);
          if (e.message && e.message.includes('401')) {
            alert('Session expired. Please sign in again.');
            logout();
          }
        }
      };
      loadData();
    }
  }, [user]);

  const handleSave = async (data: any, file: File | null) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const driveService = new DriveService(user.accessToken);
      const sheetService = new SheetService(user.accessToken);

      let receiptLink = '';
      let receiptFileId = '';

      if (file) {
        const uploadResult = await driveService.uploadFile(file);
        receiptLink = uploadResult.webViewLink;
        receiptFileId = uploadResult.id;
      }

      const saveData = {
        ...data,
        receiptLink,
        receiptFileId
      };

      // Auto-add Vendor
      if (saveData.vendor) {
        const vendor = saveData.vendor.trim();
        if (vendor && !lists.vendors.some(v => v.toLowerCase() === vendor.toLowerCase())) {
          // Fire and forget or await? Safe to await to ensure consistence
          try {
            await sheetService.addListItem('VENDOR', vendor);
            setLists(prev => ({ ...prev, vendors: [...prev.vendors, vendor].sort() }));
          } catch (e) { console.error('Failed to add vendor to list', e); }
        }
      }

      // Auto-add Property
      if ((data.type === 'Schedule E' || data.type === 'Schedule A') && saveData.propertyAddress) {
        const prop = saveData.propertyAddress.trim();
        if (prop && !lists.properties.some(p => p.toLowerCase() === prop.toLowerCase())) {
          try {
            await sheetService.addListItem('PROPERTY', prop);
            setLists(prev => ({ ...prev, properties: [...prev.properties, prop].sort() }));
          } catch (e) { console.error('Failed to add property to list', e); }
        }
      }

      if (data.type === 'Schedule C') {
        await sheetService.appendBusinessExpense({
          ...saveData,
          businessUse: saveData.percentage
        });
      } else if (data.type === 'Schedule E') {
        await sheetService.appendOtherExpense('Schedule E – Rental', saveData);
      } else if (data.type === 'Schedule A') {
        await sheetService.appendOtherExpense('Schedule A – Charity', saveData);
      }

      alert('Expense Saved Successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save expense. See console.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    // ... Login screen (same as before)
    return (
      <div className="container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>Expense Tracker</h1>
        <div className="card">
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-light)' }}>
            Please sign in to access your expenses.
          </p>
          <button className="btn btn-primary" onClick={login} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', fontSize: '0.8rem' }}>
              <strong>Setup User:</strong> Missing VITE_GOOGLE_CLIENT_ID in .env
            </div>
          )}
        </div>
      </div>
    );
  }

  const getExpenseType = (): ExpenseType => {
    switch (activeTab) {
      case 'schedule-e': return 'Schedule E';
      case 'schedule-a': return 'Schedule A';
      default: return 'Schedule C';
    }
  };

  const TAB_TITLES: Record<string, string> = {
    'schedule-c': 'Schedule C - Business',
    'schedule-e': 'Schedule E - Rental',
    'schedule-a': 'Schedule A - Charity',
    'diagnostics': 'Diagnostics'
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">Expense Tracker</h1>
        <button onClick={logout} style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>
          Sign Out
        </button>
      </header>

      <main className="container">
        <div className="card" style={{ marginBottom: '1rem', padding: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {['schedule-c', 'schedule-e', 'schedule-a', 'diagnostics'].map(tab => (
              <button
                key={tab}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  background: activeTab === tab ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab ? 'white' : 'var(--text-light)',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_TITLES[tab]}
              </button>
            ))}
          </div>
        </div>

        {activeTab !== 'diagnostics' && (
          <ExpenseForm
            categories={diagnostics?.categories || []}
            vendors={lists.vendors}
            properties={lists.properties}
            onSubmit={handleSave}
            isSubmitting={isSaving}
            type={getExpenseType()}
            title={TAB_TITLES[activeTab]}
          />
        )}

        {activeTab === 'diagnostics' && (
          <div className="card">
            {/* ... Diagnostics (same as before) */}
            <h3>Startup Diagnostics</h3>
            {diagnostics ? (
              <div style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                <p><strong>Total Categories:</strong> {diagnostics.count}</p>
                <p><strong>Stop Reason:</strong> {diagnostics.stopReason}</p>
                <p><strong>Stop Row Index:</strong> {diagnostics.stopIndex}</p>
                <p><strong>Lists Found:</strong> Vendors ({lists.vendors.length}), Properties ({lists.properties.length})</p>
                <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border)' }} />
              </div>
            ) : (
              <p>Loading categories...</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
