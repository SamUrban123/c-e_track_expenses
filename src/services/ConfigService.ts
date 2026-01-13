import { getDB, type Config } from '../db/db';

const DEFAULT_CONFIG: Config = {
    driveFolderId: '1XUq9p-quvvNWnEZgBpUkTwnEYRjuHtfy',
    spreadsheetId: '1lhDGNFcVN1oZg6gFOY4UW6QbFxBom61eiBspc7AnaEQ',
    clientId: '709375723118-agm6l0rssce2lf4dtdgrgiulkjbakeo1.apps.googleusercontent.com' // User to provide
};

export class ConfigService {
    async getConfig(): Promise<Config> {
        const db = await getDB();
        const stored = await db.get('config', 'main');

        // If stored config exists, check if we need to patch it with new defaults (e.g. ClientID)
        if (stored) {
            let patched = { ...stored };
            let paramChanged = false;

            // Force sync Client ID
            if (DEFAULT_CONFIG.clientId && stored.clientId !== DEFAULT_CONFIG.clientId) {
                patched.clientId = DEFAULT_CONFIG.clientId;
                paramChanged = true;
            }

            // Force sync Spreadsheet ID (If user provided one in code, we want it to take variance)
            if (DEFAULT_CONFIG.spreadsheetId && stored.spreadsheetId !== DEFAULT_CONFIG.spreadsheetId) {
                // Check if stored is the OLD default, if so, upgrade. 
                // Or just force upgrade if we are confident the code is truth.
                // Given the user just gave us the ID, let's force it.
                console.log('Updating Spreadsheet ID in config', DEFAULT_CONFIG.spreadsheetId);
                patched.spreadsheetId = DEFAULT_CONFIG.spreadsheetId;
                paramChanged = true;
            }

            if (paramChanged) {
                patched['key'] = 'main';
                await db.put('config', patched);
                return patched;
            }
            return stored;
        }

        // Initialize with defaults if completely missing
        const initial = { ...DEFAULT_CONFIG, key: 'main' };
        await db.put('config', initial);
        return initial;
    }

    async setConfig(config: Partial<Config>) {
        const db = await getDB();
        const current = await this.getConfig();
        await db.put('config', { ...current, ...config, key: 'main' });
    }
}

export const configService = new ConfigService();
