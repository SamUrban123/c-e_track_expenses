import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Config {
    driveFolderId: string;
    spreadsheetId: string;
    clientId?: string;
    key?: string; // For IDB keyPath
}

export interface QueueItem {
    id: string; // UUID
    type: 'UPLOAD' | 'UPDATE_ROW' | 'DELETE';
    payload: any;
    status: 'PENDING' | 'RETRY' | 'FAILED';
    createdAt: number;
    retryCount: number;
    error?: string;
    fileBlob?: Blob; // For uploads
}

export interface Receipt {
    id: string;
    date: string;
    amount: number;
    vendor: string;
    member: string;
    // ... other fields
    status: 'ACTIVE' | 'DELETED';
}

interface ReceiptDB extends DBSchema {
    config: {
        key: string;
        value: Config;
    };
    queue: {
        key: string;
        value: QueueItem;
    };
    receipts: {
        key: string;
        value: Receipt;
    };
}

let dbPromise: Promise<IDBPDatabase<ReceiptDB>>;

export const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<ReceiptDB>('receipt-app-db', 1, {
            upgrade(db) {
                // Config store
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key', autoIncrement: false });
                }
                // Queue store
                if (!db.objectStoreNames.contains('queue')) {
                    db.createObjectStore('queue', { keyPath: 'id' });
                }
                // Receipts cache
                if (!db.objectStoreNames.contains('receipts')) {
                    db.createObjectStore('receipts', { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
};
