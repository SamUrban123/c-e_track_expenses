import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureProps {
    onCapture: (blob: Blob) => void;
    onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Start camera
        const startCamera = async () => {
            try {
                const checkStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                setStream(checkStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = checkStream;
                }
            } catch (err) {
                console.error("Camera Error: ", err);
                setError('Could not access camera. Please use file upload.');
            }
        };
        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // Only on mount

    const takePhoto = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                onCapture(blob);
                // Stop stream
                stream?.getTracks().forEach(track => track.stop());
            }
        }, 'image/jpeg', 0.9);
    };

    if (error) {
        return (
            <div className="camera-error">
                <p>{error}</p>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onCapture(file);
                }} />
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            </div>
        );
    }

    return (
        <div className="camera-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'black', zIndex: 200, display: 'flex', flexDirection: 'column'
        }}>
            <video ref={videoRef} autoPlay playsInline style={{ flex: 1, width: '100%', minHeight: 0, objectFit: 'contain' }} />

            <div className="camera-controls" style={{
                padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 201
            }}>
                <button onClick={onClose} style={{ color: 'white', fontSize: '1.2rem' }}>Cancel</button>

                <button onClick={takePhoto} style={{
                    width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'white',
                    border: '4px solid rgba(255,255,255,0.5)'
                }} />

                <div style={{ width: '50px' }}></div> {/* Spacer */}
            </div>
        </div>
    );
};
