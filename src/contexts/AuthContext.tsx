import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin, type TokenResponse } from '@react-oauth/google';
import { config } from '../config/appConfig';

interface User {
    email: string;
    name: string;
    picture: string;
    accessToken: string;
}

interface AuthContextType {
    user: User | null;
    login: () => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Restore session from localStorage on mount (simple persistence)
    useEffect(() => {
        const storedUser = localStorage.getItem('user_session');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse: TokenResponse) => {
            setIsLoading(true);
            try {
                // Fetch user info with the access token
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userInfo = await userInfoResponse.json();

                if (userInfo.email !== config.allowedEmail) {
                    alert(`Access Denied: ${userInfo.email} is not in the allowlist.`);
                    googleLogout();
                    return;
                }

                const userData: User = {
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture,
                    accessToken: tokenResponse.access_token,
                };

                setUser(userData);
                localStorage.setItem('user_session', JSON.stringify(userData));
            } catch (error) {
                console.error('Login Failed:', error);
                alert('Login failed. Please try again.');
            } finally {
                setIsLoading(false);
            }
        },
        onError: (error) => {
            console.error('Login Failed:', error);
            alert('Login failed.');
        },
        scope: config.scopes.join(' '),
        flow: 'implicit', // Use implicit flow for client-side app
    });

    const logout = () => {
        googleLogout();
        setUser(null);
        localStorage.removeItem('user_session');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
