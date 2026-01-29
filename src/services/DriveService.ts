import { config } from '../config/appConfig';

interface DriveFile {
    id: string;
    webViewLink: string;
    name: string;
}

export class DriveService {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    async uploadFile(file: File, folderId: string = config.driveFolderId): Promise<DriveFile> {
        const metadata = {
            name: file.name,
            parents: [folderId],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
            body: form,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Drive Upload Failed: ${response.status} - ${errorText}`);
        }

        return response.json();
    }
}
