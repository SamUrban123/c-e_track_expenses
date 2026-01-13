import { googleClient } from './GoogleClient';
import { configService } from './ConfigService';
import { DateTime } from 'luxon';

export class DriveService {
    async getRootFolderId() {
        return (await configService.getConfig()).driveFolderId;
    }

    async findFolder(name: string, parentId: string): Promise<string | null> {
        const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`;
        const res = await googleClient.request(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
        if (res.files && res.files.length > 0) {
            return res.files[0].id; // Return first match
        }
        return null;
    }

    async createFolder(name: string, parentId: string): Promise<string> {
        const res = await googleClient.request('https://www.googleapis.com/drive/v3/files', 'POST', {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        });
        return res.id;
    }

    async ensureFolder(name: string, parentId: string): Promise<string> {
        const existing = await this.findFolder(name, parentId);
        if (existing) return existing;
        return this.createFolder(name, parentId);
    }

    /**
     * Structure: /Receipts/<MemberName>/<Vendor>/<YYYY>/<YYYY-MM>/
     * But user asked for: /Receipts/<MemberName>/<Vendor>/<YYYY>/<YYYY-MM>/<YYYY-MM-DD>_<Vendor>_<AmountUSD>_<ShortId>.pdf
     * Wait, prompt said: /Receipts/<MemberName>/<Vendor>/<YYYY>/<YYYY-MM>/...
     * Wait, prompt said:
     * /Receipts/<MemberName>/<Vendor>/<YYYY>/<YYYY-MM>/<YYYY-MM-DD>_<Vendor>_<AmountUSD>_<ShortId>.pdf
     * 
     * Actually user said Admin owns ONE shared root folder. 
     * Is that root folder already "Receipts"? Or should I create "Receipts" inside it?
     * "Admin owns ONE shared root folder... shared with Nolan and Louis. Folder structure: /Receipts/..."
     * So inside the Shared Folder, there should be "Receipts".
     */
    async getReceiptsRootInfo() {
        const rootId = await this.getRootFolderId();
        // Check if "Receipts" exists in Root, if not create
        const receiptsId = await this.ensureFolder('Receipts', rootId);
        return receiptsId;
    }

    async ensureFolderHierarchy(member: string, vendor: string, dateStr: string): Promise<string> {
        // dateStr is ISO YYYY-MM-DD
        const dt = DateTime.fromISO(dateStr);
        const year = dt.toFormat('yyyy');
        const month = dt.toFormat('yyyy-MM');

        // 1. Receipts Root
        const receiptsId = await this.getReceiptsRootInfo();

        // 2. Member
        const memberId = await this.ensureFolder(member, receiptsId);

        // 3. Vendor
        // Sanitize vendor for folder name (remove illegal chars)
        const safeVendor = vendor.replace(/[\\/:*?"<>|]/g, '_').trim();
        const vendorId = await this.ensureFolder(safeVendor, memberId);

        // 4. Year
        const yearId = await this.ensureFolder(year, vendorId);

        // 5. Month
        const monthId = await this.ensureFolder(month, yearId);

        return monthId;
    }

    async uploadReceipt(file: Blob, member: string, vendor: string, date: string, amount: number, shortId: string): Promise<{ fileId: string; webViewLink: string }> {
        const parentId = await this.ensureFolderHierarchy(member, vendor, date);

        // Filename: <YYYY-MM-DD>_<Vendor>_<AmountUSD>_<ShortId>.pdf
        const safeVendor = vendor.replace(/[\\/:*?"<>|]/g, '_').trim();
        const amountStr = amount.toFixed(2);
        const filename = `${date}_${safeVendor}_$${amountStr}_${shortId}.pdf`;

        const metadata = {
            name: filename,
            parents: [parentId],
        };

        const res = await googleClient.uploadFile(file, metadata);

        // We need webViewLink, but upload response might not include it unless fields requested?
        // v3 upload response usually includes id, name, mimeType.
        // Let's fetch fields if needed, or just return ID and assume we can construct link or fetch later.
        // Better to fetch it now.

        const fileInfo = await googleClient.request(`https://www.googleapis.com/drive/v3/files/${res.id}?fields=id,webViewLink`);

        return {
            fileId: fileInfo.id,
            webViewLink: fileInfo.webViewLink
        };
    }
}

export const driveService = new DriveService();
