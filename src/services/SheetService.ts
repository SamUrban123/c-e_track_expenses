import { config } from '../config/appConfig';

interface CategoryResult {
    categories: string[];
    stopReason: 'BLANK' | 'ANNUAL_TOTAL' | 'CAP' | 'ERROR';
    stopIndex: number;
}

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export class SheetService {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    private async fetch(endpoint: string, options: RequestInit = {}) {
        const url = `${BASE_URL}/${config.spreadsheetId}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Sheets API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        return response.json();
    }

    async getCategories(): Promise<CategoryResult> {
        // Read Summary Dashboard!A2:A502 (Cap at 500 rows safe limit)
        const range = 'Summary Dashboard!A2:A502';

        try {
            const data = await this.fetch(`/values/${encodeURIComponent(range)}`);
            const rows = data.values as string[][] | undefined;

            if (!rows || rows.length === 0) {
                return { categories: [], stopReason: 'BLANK', stopIndex: 2 }; // A2 was empty
            }

            const categories: string[] = [];
            let stopReason: CategoryResult['stopReason'] = 'CAP';
            let stopIndex = 2; // Starting row

            for (let i = 0; i < rows.length; i++) {
                const cellValue = rows[i][0]; // Column A
                stopIndex = 2 + i;

                // Stop Condition 1: Blank cell
                if (!cellValue || cellValue.trim() === '') {
                    stopReason = 'BLANK';
                    break;
                }

                // Stop Condition 2: "Annual Total"
                if (cellValue.trim().toLowerCase() === 'annual total') {
                    stopReason = 'ANNUAL_TOTAL';
                    break;
                }

                categories.push(cellValue.trim());
            }

            return {
                categories,
                stopReason,
                stopIndex
            };

        } catch (error) {
            console.error('Error fetching categories:', error);
            return { categories: [], stopReason: 'ERROR', stopIndex: 0 };
        }
    }

    async getLists() {
        // Read Lists!A2:B
        const range = 'Lists!A2:B';
        try {
            const data = await this.fetch(`/values/${encodeURIComponent(range)}`);
            const rows = data.values as string[][] | undefined;

            if (!rows) return { vendors: [], properties: [] };

            const vendors = new Set<string>();
            const properties = new Set<string>();

            rows.forEach(row => {
                if (row[0]) vendors.add(row[0].trim());
                if (row[1]) properties.add(row[1].trim());
            });

            return {
                vendors: Array.from(vendors).sort(),
                properties: Array.from(properties).sort()
            };
        } catch (e: any) {
            // If tab doesn't exist, return empty
            if (e.message && e.message.includes('Unable to parse range')) {
                console.warn('Lists tab not found');
                return { vendors: [], properties: [] };
            }
            console.error('Error fetching lists:', e);
            return { vendors: [], properties: [] };
        }
    }

    async getNextEmptyRow(tabName: string): Promise<number> {
        // Check Date column (A) to find first empty row after A2
        const range = `${tabName}!A2:A`;
        const data = await this.fetch(`/values/${encodeURIComponent(range)}`);
        const rows = data.values as string[][] | undefined;

        if (!rows) return 2; // If no data, start at row 2

        // Find first empty index
        // rows array corresponds to A2, A3, etc.
        // so length + 2 is the next row.
        // BUT, we need to handle gaps if they exist? 
        // "Find the first empty row by scanning down from row 2 where the 'Date' cell is blank."
        // If the API returns values, it usually truncates trailing empty rows.
        // So 'rows.length + 2' is generally safe for "append to end".
        // However, if there are gaps (e.g. A2 full, A3 empty, A4 full), 'values' might include "" for A3.

        // Let's iterate to be safe.
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i][0]) {
                return i + 2;
            }
        }

        return rows.length + 2;
    }

    async appendBusinessExpense(data: {
        date: string;
        vendor: string;
        description: string;
        amount: number;
        category: string;
        businessUse: number; // 0.0 to 1.0
        notes: string;
        receiptLink: string;
        receiptFileId: string;
    }) {
        const TAB = 'Schedule C – Business';
        const row = await this.getNextEmptyRow(TAB);

        const expenseId = crypto.randomUUID();
        const status = 'Active';
        const timestamp = new Date().toISOString();

        // Columns A-H
        // Date, Vendor, Description, Amount, Category, Biz %, Notes, Receipt Link
        const mainValues = [
            data.date,
            data.vendor,
            data.description,
            data.amount,
            data.category,
            data.businessUse,
            data.notes,
            `=HYPERLINK("${data.receiptLink}", "Receipt")`
        ];

        // Columns M-Q (Metadata)
        // ExpenseId, ReceiptFileId, Status, CreatedAt, UpdatedAt
        const metaValues = [
            expenseId,
            data.receiptFileId,
            status,
            timestamp,
            timestamp
        ];

        // Write Main Data (A:H)
        await this.fetch(`/values/${encodeURIComponent(`${TAB}!A${row}:H${row}`)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({ values: [mainValues] })
        });

        // Write Metadata (M:Q)
        await this.fetch(`/values/${encodeURIComponent(`${TAB}!M${row}:Q${row}`)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({ values: [metaValues] })
        });

        return { row, expenseId };
    }

    async appendOtherExpense(
        tabName: 'Schedule E – Rental' | 'Schedule A – Charity',
        data: {
            date: string;
            vendor: string;
            description: string;
            amount: number;
            propertyAddress: string;
            category: string;
            percentage: number;
            notes: string;
            receiptLink: string;
            receiptFileId: string;
        }
    ) {
        const row = await this.getNextEmptyRow(tabName);

        const expenseId = crypto.randomUUID();
        const status = 'Active';
        const timestamp = new Date().toISOString();

        // Columns A-I
        // Date, Vendor, Description, Amount, Property, Category, %, Notes, Receipt Link
        const mainValues = [
            data.date,
            data.vendor,
            data.description,
            data.amount,
            data.propertyAddress,
            data.category,
            data.percentage,
            data.notes,
            `=HYPERLINK("${data.receiptLink}", "Receipt")`
        ];

        // Columns J-N (Metadata)
        // ExpenseId, ReceiptFileId, Status, CreatedAt, UpdatedAt
        const metaValues = [
            expenseId,
            data.receiptFileId,
            status,
            timestamp,
            timestamp
        ];

        // Write Main Data (A:I)
        await this.fetch(`/values/${encodeURIComponent(`${tabName}!A${row}:I${row}`)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({ values: [mainValues] })
        });

        // Write Metadata (J:N)
        await this.fetch(`/values/${encodeURIComponent(`${tabName}!J${row}:N${row}`)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({ values: [metaValues] })
        });

        return { row, expenseId };
    }

    async addListItem(type: 'VENDOR' | 'PROPERTY', value: string) {
        const cleanValue = value.trim();
        if (!cleanValue) return;

        // Check cache or re-fetch? For now, blind append if unique check passed in App? 
        // Or re-check here. Re-checking here is safer.
        const lists = await this.getLists();
        const exists = type === 'VENDOR'
            ? lists.vendors.some(v => v.toLowerCase() === cleanValue.toLowerCase())
            : lists.properties.some(p => p.toLowerCase() === cleanValue.toLowerCase());

        if (exists) return;

        const col = type === 'VENDOR' ? 'A' : 'B';
        const tab = 'Lists';

        // Find next empty row in specific column
        const range = `${tab}!${col}2:${col}`;
        const data = await this.fetch(`/values/${encodeURIComponent(range)}`);
        const rows = data.values as string[][] | undefined;

        // Next row is length + 2 (start at 2)
        // Check for gaps logic same as before or just simple?
        // Simple append to end of column block is fine for lists.
        const nextRow = (rows?.length || 0) + 2;

        await this.fetch(`/values/${encodeURIComponent(`${tab}!${col}${nextRow}`)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({ values: [[cleanValue]] })
        });
    }
}
