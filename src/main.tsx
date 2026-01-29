import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';

// We need a wrapper to fetch the CLIEN_ID if we were using it, 
// but for GIS Implicit flow in this specific setup, we might need a Client ID.
// However, the user didn't provide one. I should have asked, or I can try to use a placeholder 
// and ask the user to create one in the setup guide. 
// CHECK: Does @react-oauth/google require a Client ID? YES.
// I will put a placeholder and ask the user to update it in the setup guide/config.

// actually, I can't run without it. 
// I will pause and ask the user for the Client ID in the setup guide, 
// BUT for now I will hardcode a placeholder or use an env var 
// and proceed with the UI structure.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID_HERE";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
