import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/AuthService';
import type { UserProfile } from '../types/auth';
import { configService } from '../services/ConfigService';

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    signIn: () => void;
    signOut: () => void;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            // Wait for Google Script
            let attempts = 0;
            while (!window.google && attempts < 20) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }

            if (!window.google) {
                if (mounted) setError('Google Sign-In script failed to load.');
                return;
            }

            try {
                const config = await configService.getConfig();
                console.log('Config loaded:', config); // Debug log

                if (config.clientId) {
                    authService.init(config.clientId, async (tokenResp) => {
                        const profile = await authService.fetchUserProfile(tokenResp.access_token);
                        if (profile) {
                            setUser(profile);
                            setError(null);
                        } else {
                            setError('User not allowed.');
                        }
                    });
                    console.log('AuthService initialized');
                } else {
                    console.error('Client ID is missing in config');
                    if (mounted) setError('Client ID is missing in configuration.');
                }
            } catch (e) {
                console.error(e);
                if (mounted) setError('Failed to initialize authentication.');
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        initAuth();
        return () => { mounted = false; };
    }, []);

    const signIn = () => {
        if (!authService.isInitialized()) {
            console.error('AuthService not initialized. Client ID:', configService, 'Google:', !!window.google);
            alert('Auth Error: Service not ready. If you just reloaded, wait a moment. Check console for details.');
            return;
        }
        authService.requestAccessToken();
    };

    const signOut = () => {
        // Revoke?
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
