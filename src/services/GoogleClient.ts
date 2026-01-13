import { authService } from './AuthService';

export class GoogleClient {
    private async getHeaders(contentType: string | null = 'application/json') {
        const token = authService.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        const headers: HeadersInit = {
            'Authorization': `Bearer ${token}`
        };
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        return headers;
    }

    async request(url: string, method: string = 'GET', body?: any) {
        const headers = await this.getHeaders();
        const config: RequestInit = {
            method,
            headers,
        };
        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(url, config);
        if (!response.ok) {
            // Handle 401 specifically? 
            // For now, just throw.
            const errorText = await response.text();
            throw new Error(`Google API Error ${response.status}: ${errorText}`);
        }
        return response.json();
    }

    /**
     * Uploads a file using multipart/related to preserve metadata and content in one go.
     */
    async uploadFile(file: Blob, metadata: any, fileId?: string): Promise<any> {
        const token = authService.getAccessToken();
        if (!token) throw new Error('Not authenticated');

        const method = fileId ? 'PATCH' : 'POST';
        const url = fileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelim = `\r\n--${boundary}--`;

        const contentType = file.type || 'application/octet-stream';

        // Body construction
        let body = delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata);

        body += delimiter +
            `Content-Type: ${contentType}\r\n` +
            'Content-Transfer-Encoding: base64\r\n\r\n';

        // We need to read the blob as base64 to manually construct the body string effectively 
        // OR use FormData, but Drive API multipart can be tricky with FormData and JSON metadata.
        // Standard approach for Drive API multipart in JS usually uses a constructed body string/buffer.
        // Since we are client side, constructing a massive string for a large PDF might be memory heavy, 
        // but receipts are small (<5MB).

        const base64Data = await this.blobToBase64(file);
        body += base64Data + closeDelim;

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary="${boundary}"` // Quotes important
            },
            body
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Upload Failed ${response.status}: ${txt}`);
        }

        return response.json();
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // remove data:application/pdf;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

export const googleClient = new GoogleClient();
