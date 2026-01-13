import { getDB, type QueueItem } from '../db/db';
import { driveService } from './DriveService';
import { sheetService } from './SheetService';

export class SyncService {
    private isSyncing = false;

    async processQueue() {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;

        try {
            const db = await getDB();
            const queue = await db.getAll('queue');
            const pending = queue.filter(i => i.status === 'PENDING' || i.status === 'RETRY');

            console.log(`Sync Processing: ${pending.length} items`);

            for (const item of pending) {
                try {
                    await this.processItem(item);
                    // Success - Remove from queue
                    await db.delete('queue', item.id);
                    // Also add to Receipts cache if needed (for History)
                    // For now, History fetches from Sheets mostly, but fresh local items might be good.
                } catch (e) {
                    console.error('Sync Error for item', item.id, e);
                    const newItem = { ...item, status: 'RETRY', retryCount: item.retryCount + 1, error: (e as Error).message };
                    // If retry > 5, mark as FAILED?
                    if (newItem.retryCount > 5) newItem.status = 'FAILED';
                    await db.put('queue', newItem as QueueItem); // Type cast if needed
                }
            }
        } catch (e) {
            console.error('Sync Loop Fail', e);
        } finally {
            this.isSyncing = false;
        }
    }

    private async processItem(item: QueueItem) {
        if (item.type === 'UPLOAD') {
            const data = item.payload;
            const pdfBlob = item.fileBlob;

            if (!pdfBlob) throw new Error('Missing PDF Blob locally');

            // 1. Upload to Drive
            // Check if we already have fileId (partial success retry)
            let fileId = data.fileId;
            let webViewLink = data.receiptLink;

            if (!fileId) {
                const uploadRes = await driveService.uploadReceipt(
                    pdfBlob,
                    data.memberName,
                    data.vendor,
                    data.date,
                    parseFloat(data.amount),
                    data.shortId
                );
                fileId = uploadRes.fileId;
                webViewLink = uploadRes.webViewLink;
            }

            // 2. Append to Sheet
            const expenseData = {
                ...data,
                fileId,
                receiptLink: webViewLink
            };

            await sheetService.appendExpense(expenseData);
        }
        // Handle DELETE / UPDATE later
    }
}

export const syncService = new SyncService();
