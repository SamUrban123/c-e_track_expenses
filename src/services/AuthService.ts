import type { TokenResponse, UserProfile } from '../types/auth';
import { ALLOWED_EMAILS } from '../types/auth';

const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

export class AuthService {
    private tokenClient: any;
    private accessToken: string | null = null;
    private tokenExpiry: number | null = null;

    init(clientId: string, onTokenResponse: (response: TokenResponse) => void) {
        console.log('AuthService.init check:', {
            hasGoogle: !!window.google,
            hasAccounts: !!window.google?.accounts,
            hasOauth2: !!window.google?.accounts?.oauth2,
            clientId: clientId
        });

        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
            console.error('Google scripts missing components during init');
            return;
        }

        try {
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: (resp: TokenResponse) => {
                    if (resp.error) {
                        console.error('Auth Error:', resp);
                        return;
                    }
                    this.accessToken = resp.access_token;
                    this.tokenExpiry = Date.now() + resp.expires_in * 1000;
                    onTokenResponse(resp);
                },
            });
            console.log('TokenClient initialized:', this.tokenClient);
        } catch (e) {
            console.error('Error initializing TokenClient:', e);
        }
    }

    isInitialized() {
        return !!this.tokenClient;
    }

    requestAccessToken() {
        this.tokenClient?.requestAccessToken();
    }

    getAccessToken(): string | null {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        return null;
    }

    async fetchUserProfile(accessToken: string): Promise<UserProfile | null> {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await res.json();

            const email = data.email;
            const memberName = ALLOWED_EMAILS[email];

            if (!memberName) {
                throw new Error(`Email ${email} is not authorized.`);
            }

            return {
                name: data.name,
                email: data.email,
                picture: data.picture,
                memberName: memberName,
            };
        } catch (e) {
            console.error('Fetch Profile Error', e);
            return null;
        }
    }

    isAuthenticated(): boolean {
        return !!this.getAccessToken();
    }
}

export const authService = new AuthService();
