import React, { useEffect, useState } from 'react';
import { sheetService } from '../services/SheetService';

interface ReceiptFormData {
    date: string;
    amount: string;
    vendor: string;
    category: string;
    propertyId: string;
    description: string;
    paidVia: string;
    is1099: string;
    notes: string;
}

interface ReceiptFormProps {
    initialData?: Partial<ReceiptFormData>;
    onSubmit: (data: ReceiptFormData) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
    const [formData, setFormData] = useState<ReceiptFormData>({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        vendor: '',
        category: '',
        propertyId: '',
        description: '',
        paidVia: '',
        is1099: 'No',
        notes: '',
        ...initialData
    });

    const [dropdowns, setDropdowns] = useState<{ categories: string[], properties: string[], vendors: string[] }>({
        categories: [], properties: [], vendors: []
    });

    useEffect(() => {
        const Load = async () => {
            try {
                const dd = await sheetService.getDropdowns();
                console.log('Dropdowns loaded:', dd);
                if (dd.categories.length === 0) console.warn('Categories empty. Check sheet tab "Chart of Accounts" column A.');
                setDropdowns(dd);
            } catch (e) {
                console.error('Failed to load dropdowns:', e);
            }
        };
        Load();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="receipt-form">
            <h3>Review Receipt</h3>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Date *</label>
                <input type="date" name="date" className="input" value={formData.date} onChange={handleChange} required />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Vendor *</label>
                <input
                    list="vendor-list"
                    name="vendor"
                    className="input"
                    value={formData.vendor}
                    onChange={handleChange}
                    placeholder="Select or Type Vendor"
                    required
                />
                <datalist id="vendor-list">
                    {dropdowns.vendors.map(v => <option key={v} value={v} />)}
                </datalist>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Amount (USD) *</label>
                <input type="number" step="0.01" name="amount" className="input" value={formData.amount} onChange={handleChange} required />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Category *</label>
                <select name="category" className="input" value={formData.category} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    {dropdowns.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Property ID *</label>
                <select name="propertyId" className="input" value={formData.propertyId} onChange={handleChange} required>
                    <option value="">Select Property</option>
                    <option value="General Business Expense">General Business Expense</option>
                    {dropdowns.properties.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Paid Via *</label>
                <select name="paidVia" className="input" value={formData.paidVia} onChange={handleChange} required>
                    <option value="">Select Payment Method</option>
                    <option value="Bank">Bank</option>
                    <option value="Business Credit">Business Credit</option>
                    <option value="Personal Credit">Personal Credit</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Description</label>
                <input type="text" name="description" className="input" value={formData.description} onChange={handleChange} />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Notes</label>
                <textarea name="notes" className="input" value={formData.notes} onChange={handleChange} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
                <button className="btn" onClick={() => onSubmit(formData)} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Expense'}
                </button>
            </div>
        </div>
    );
};
