import React, { useState, useEffect } from 'react';

export type ExpenseType = 'Schedule C' | 'Schedule E' | 'Schedule A';

interface ExpenseFormProps {
    categories: string[];
    properties: string[];
    vendors: string[]; // For autocomplete if we add it
    onSubmit: (data: any, file: File | null) => Promise<void>;
    isSubmitting: boolean;
    type: ExpenseType;
    title?: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ categories, properties, onSubmit, isSubmitting, type, title }) => {
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
    const [isProcessing, setIsProcessing] = useState(false);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files ? e.target.files[0] : null;
        if (!selectedFile) {
            // Don't clear if they cancelled? Or clear? Usually clear.
            // But if I have a file and click cancel, browsers often send empty list.
            // Let's safe-guard: if no file selected, just return (keep old file) or clear?
            // Standard behavior is clear.
            // setFile(null); 
            return;
        }

        // If PDF, just set it
        if (selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            return;
        }

        // If Image, Convert to PDF
        if (selectedFile.type.startsWith('image/')) {
            setIsProcessing(true);
            try {
                const { jsPDF } = await import('jspdf');
                const doc = new jsPDF();

                // Load image
                const imgData = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(selectedFile);
                });

                // Add image to PDF (Fit to page)
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = doc.internal.pageSize.getHeight();
                const ratio = imgProps.width / imgProps.height;
                let w = pdfWidth - 20; // 10mm margin
                let h = w / ratio;
                if (h > pdfHeight - 20) {
                    h = pdfHeight - 20;
                    w = h * ratio;
                }

                doc.addImage(imgData, 'JPEG', 10, 10, w, h);
                const pdfBlob = doc.output('blob');
                const pdfFile = new File([pdfBlob], `${selectedFile.name.split('.')[0]}.pdf`, { type: 'application/pdf' });

                setFile(pdfFile);
            } catch (err) {
                console.error('PDF Conversion Failed', err);
                alert('Failed to convert image to PDF. Using original image.');
                setFile(selectedFile);
            } finally {
                setIsProcessing(false);
            }
        } else {
            setFile(selectedFile); // Fallback
        }
    };

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
            <h3 style={{ marginBottom: '1rem' }}>{title || `New Expense (${type})`}</h3>

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
                <label>Receipt - PDF Auto-Convert Active</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <button
                        type="button"
                        className="btn"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}
                        onClick={() => document.getElementById('camera-input')?.click()}
                    >
                        📷 Take Photo
                    </button>
                    <button
                        type="button"
                        className="btn"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}
                        onClick={() => document.getElementById('file-input')?.click()}
                    >
                        📁 Upload File
                    </button>
                </div>

                {/* Hidden Inputs */}
                <input
                    id="camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    disabled={isProcessing}
                    onChange={handleFileChange}
                />
                <input
                    id="file-input"
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    disabled={isProcessing}
                    onChange={handleFileChange}
                />
                {isProcessing && <div style={{ fontSize: '0.8rem', color: '#ea580c' }}>Processing image to PDF...</div>}
                {file && !isProcessing && <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'green' }}>Attached: {file.name}</div>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting || isProcessing}>
                {isSubmitting ? 'Saving...' : (isProcessing ? 'Processing PDF...' : 'Save Expense')}
            </button>
        </form>
    );
};
