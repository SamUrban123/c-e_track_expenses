export interface UserProfile {
    name: string;
    email: string;
    picture: string;
    memberName: 'Sam' | 'Nolan' | 'Louis';
}

export const ALLOWED_EMAILS: Record<string, UserProfile['memberName']> = {
    'samurban2364@gmail.com': 'Sam',
    'nolansalani@gmail.com': 'Nolan',
    'louieurban12@gmail.com': 'Louis',
};

// Google Identity Services Types (Partial)
export interface TokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    error?: string;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: any) => {
                        requestAccessToken: (overrideConfig?: any) => void;
                    };
                    revoke: (accessToken: string, done: () => void) => void;
                };
            };
        };
    }
}
