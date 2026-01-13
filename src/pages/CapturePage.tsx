import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CameraCapture } from '../components/CameraCapture';
import { ReceiptForm } from '../components/ReceiptForm';
import { pdfService } from '../services/PDFService';
import { driveService } from '../services/DriveService';
import { sheetService } from '../services/SheetService';
import { getDB, type QueueItem } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';

export const CapturePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [step, setStep] = useState<'capture' | 'review' | 'uploading'>('capture');
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);



    const handleCapture = (blob: Blob) => {
        setImageBlob(blob);
        setStep('review');
    };

    const calculateClass = () => {
        // Basic heuristic: Repairs/Maintenance -> OpEx?
        // Improvements -> CapEx?
        // User can manually override if we added a field, but for now we default.
        return 'OpEx'; // Default
    };

    const handleSubmit = async (data: any) => {
        if (!imageBlob || !user) return;
        setIsSubmitting(true);

        try {
            const id = uuidv4();
            const shortId = id.substring(0, 8);

            // 1. Generate PDF (or pass through if already PDF)
            const pdfBlob = imageBlob.type === 'application/pdf'
                ? imageBlob
                : await pdfService.createPdfFromImage(imageBlob);

            // 2. Prepare Data
            const expenseData = {
                ...data,
                id,
                member: user.memberName,
                class: calculateClass(),
                receiptLink: '', // Filled after upload
                fileId: ''       // Filled after upload
            };

            // 3. Try Direct Upload (Optimistic UI)
            if (navigator.onLine) {
                try {
                    const { fileId, webViewLink } = await driveService.uploadReceipt(
                        pdfBlob,
                        user.memberName,
                        data.vendor,
                        data.date,
                        parseFloat(data.amount),
                        shortId
                    );

                    expenseData.fileId = fileId;
                    expenseData.receiptLink = webViewLink;

                    await sheetService.appendExpense(expenseData);

                    // Done!
                    alert('Receipt Saved Successfully!');
                    navigate('/');
                    return;
                } catch (e) {
                    console.error('Online upload failed, falling back to queue', e);
                    // Fallthrough to queue
                }
            }

            // 4. Queue for Offline
            const db = await getDB();
            const queueItem: QueueItem = {
                id,
                type: 'UPLOAD',
                payload: { ...expenseData, memberName: user.memberName, shortId }, // Payload needs metadata to retry upload
                status: 'PENDING',
                createdAt: Date.now(),
                retryCount: 0,
                fileBlob: pdfBlob // We store the PDF blob in IDB
            };

            await db.put('queue', queueItem);
            alert('Saved to Queue (Offline). Will upload when online.');
            navigate('/');

        } catch (e) {
            console.error(e);
            alert('Error saving receipt: ' + (e as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const [mode, setMode] = useState<'camera' | 'import'>('camera');

    useEffect(() => {
        if (searchParams.get('mode') === 'import') {
            setMode('import');
        } else {
            setMode('camera');
        }
    }, [searchParams]);

    if (step === 'capture') {
        if (mode === 'import') {
            return (
                <div className="container">
                    <h2>Import Receipt</h2>
                    <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                        <p>Select a PDF or Image file.</p>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCapture(file);
                            }}
                            style={{ display: 'block', margin: '0 auto 1rem auto' }}
                        />
                        {imageBlob && (
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                {imageBlob.type === 'application/pdf' ? (
                                    <div style={{ padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '3rem' }}>📄</span>
                                        <p>{(imageBlob as any).name || 'PDF Document'}</p>
                                    </div>
                                ) : (
                                    <img
                                        src={URL.createObjectURL(imageBlob)}
                                        alt="Receipt Preview"
                                        style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid #ccc' }}
                                    />
                                )}
                            </div>
                        )}
                        <button className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
                    </div>
                </div>
            );
        }
        return <CameraCapture onCapture={handleCapture} onClose={() => navigate('/')} />;
    }

    return (
        <div className="container">
            {imageBlob && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    {imageBlob.type === 'application/pdf' ? (
                        <div style={{ padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
                            <span style={{ fontSize: '3rem' }}>📄</span>
                            <p>{(imageBlob as any).name || 'PDF Document'}</p>
                        </div>
                    ) : (
                        <img
                            src={URL.createObjectURL(imageBlob)}
                            alt="Receipt Preview"
                            style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                    )}
                </div>
            )}

            <ReceiptForm
                onSubmit={handleSubmit}
                onCancel={() => setStep('capture')}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};
