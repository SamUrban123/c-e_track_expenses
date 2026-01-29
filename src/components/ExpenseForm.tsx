import React, { useState, useEffect } from 'react';

export type ExpenseType = 'Schedule C' | 'Schedule E' | 'Schedule A';

interface ExpenseFormProps {
    categories: string[];
    properties: string[];
    vendors: string[]; // For autocomplete if we add it
    onSubmit: (data: any, file: File | null) => Promise<void>;
    isSubmitting: boolean;
    type: ExpenseType;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ categories, properties, onSubmit, isSubmitting, type }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [vendor, setVendor] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [percentage, setPercentage] = useState('100'); // Business Use % or Rental %
    const [selectedProperty, setSelectedProperty] = useState('');
    const [isNewProperty, setIsNewProperty] = useState(false);
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Default Category for Charity
    useEffect(() => {
        if (type === 'Schedule A') {
            // Check if 'Charity' exists in categories
            const hasCharity = categories.some(c => c.toLowerCase() === 'charity');
            if (hasCharity) {
                setCategory('Charity');
            }
            // else: Surface error? User prompt said: "surface a clear error". 
            // We'll show it in the UI below.
        } else {
            setCategory('');
        }
    }, [type, categories]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!date || !amount || !category) {
            alert('Please fill in required fields');
            return;
        }

        if (type === 'Schedule E' && !selectedProperty) {
            alert('Property Address is required for Schedule E');
            return;
        }

        // Convert % to decimal
        const pctDecimal = parseFloat(percentage) / 100;

        const data = {
            date,
            vendor,
            description,
            amount: parseFloat(amount),
            category,
            percentage: pctDecimal,
            notes,
            propertyAddress: selectedProperty,
            type // Pass type to handler
        };

        await onSubmit(data, file);

        // Reset basic fields
        setDescription('');
        setAmount('');
        setNotes('');
        setFile(null);
        setVendor('');
        setPercentage('100');
        // Keep Date, Category, Property for convenience
    };

    const isCharity = type === 'Schedule A';
    const hasCharityCat = categories.some(c => c.toLowerCase() === 'charity');

    return (
        <form onSubmit={handleSubmit} className="card">
            <h3 style={{ marginBottom: '1rem' }}>New Expense ({type})</h3>

            {isCharity && !hasCharityCat && (
                <div style={{ padding: '0.5rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    Error: "Charity" category missing from Dashboard!
                </div>
            )}

            <div className="input-group">
                <label>Date *</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />
            </div>

            <div className="input-group">
                <label>Vendor *</label>
                <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    list="vendor-list"
                    required
                />
                <datalist id="vendor-list">
                    {/* We don't have vendors passed in yet, keeping placeholder logic */}
                </datalist>
            </div>

            <div className="input-group">
                <label>Description</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div className="input-group">
                <label>Amount (USD) *</label>
                <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                />
            </div>

            {(type === 'Schedule E' || type === 'Schedule A') && (
                <div className="input-group">
                    <label>Property Address {type === 'Schedule E' ? '*' : '(Optional)'}</label>
                    {!isNewProperty ? (
                        <select
                            value={selectedProperty}
                            onChange={(e) => {
                                if (e.target.value === 'NEW') {
                                    setIsNewProperty(true);
                                    setSelectedProperty('');
                                } else {
                                    setSelectedProperty(e.target.value);
                                }
                            }}
                            required={type === 'Schedule E'}
                        >
                            <option value="">Select Property</option>
                            {properties.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                            <option value="NEW">+ Add New Property</option>
                        </select>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={selectedProperty}
                                onChange={(e) => setSelectedProperty(e.target.value)}
                                placeholder="Enter property address"
                                required={type === 'Schedule E'}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="btn"
                                style={{ width: 'auto', padding: '0.5rem', border: '1px solid var(--border)' }}
                                onClick={() => {
                                    setIsNewProperty(false);
                                    setSelectedProperty('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="input-group">
                <label>Category *</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    disabled={isCharity && hasCharityCat} // Lock if default found, or allow change? req says "default... restrict". Assume lock or pre-select.
                >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            <div className="input-group">
                <label>{type === 'Schedule C' ? 'Business Use %' : 'Rental %'}</label>
                <input
                    type="number"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                />
            </div>

            <div className="input-group">
                <label>Notes</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                />
            </div>

            <div className="input-group">
                <label>Receipt</label>
                <input
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                />
                {file && <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'green' }}>Attached: {file.name}</div>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
        </form>
    );
};
