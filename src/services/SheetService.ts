import { googleClient } from './GoogleClient';
import { configService } from './ConfigService';

export interface ColumnMapping {
    Date: number; // 0-indexed column index
    PropertyID: number;
    Vendor: number;
    Description: number;
    Amount: number;
    Category: number;
    Class: number;
    Is1099: number;
    PaidVia: number;
    ReceiptLink: number;
    Notes: number;
    // Metadata
    ExpenseId?: number;
    Member?: number;
    ReceiptFileId?: number;
    Status?: number;
    Created?: number;
    Updated?: number;
}

export class SheetService {
    private colMap: ColumnMapping | null = null;
    private spreadsheetId: string = '';

    private getColLetter(colIndex: number): string {
        let temp, letter = '';
        while (colIndex >= 0) {
            temp = (colIndex) % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            colIndex = Math.floor((colIndex - temp) / 26) - 1;
        }
        return letter;
    }

    async init() {
        const cfg = await configService.getConfig();
        this.spreadsheetId = cfg.spreadsheetId;
    }

    async fetchHeaders(): Promise<ColumnMapping> {
        if (!this.spreadsheetId) await this.init();

        const range = 'Transactions (1065)!1:1';
        const res = await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}`
        );

        const headers = res.values?.[0] || [];
        const map: any = {};

        headers.forEach((h: string, i: number) => {
            const lower = h.trim().toLowerCase();
            if (lower === 'date') map.Date = i;
            else if (lower === 'property id') map.PropertyID = i;
            else if (lower === 'vendor') map.Vendor = i;
            else if (lower === 'description') map.Description = i;
            else if (lower === 'amount') map.Amount = i;
            else if (lower === 'category') map.Category = i;
            else if (lower.includes('class')) map.Class = i; // "Class (OpEx/CapEx)"
            else if (lower.includes('1099')) map.Is1099 = i;
            else if (lower.includes('paid via')) map.PaidVia = i;
            else if (lower === 'receipt link') map.ReceiptLink = i;
            else if (lower === 'notes') map.Notes = i;
            else if (lower === 'expenseid') map.ExpenseId = i;
            else if (lower === 'member') map.Member = i;
            else if (lower === 'receiptfileid') map.ReceiptFileId = i;
            else if (lower === 'status') map.Status = i;
            else if (lower.startsWith('created')) map.Created = i;
            else if (lower.startsWith('updated')) map.Updated = i;
        });

        this.colMap = map;
        return map as ColumnMapping;
    }

    async ensureMetadataColumns() {
        if (!this.colMap) await this.fetchHeaders();
        if (this.colMap?.ExpenseId !== undefined) return; // Already exists

        // Add columns to the right
        const res = await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Transactions (1065)!1:1`
        );
        const headers = res.values?.[0] || [];
        const nextCol = headers.length;

        const newHeaders = ['ExpenseId', 'Member', 'ReceiptFileId', 'Status', 'CreatedTimestamp', 'UpdatedTimestamp'];

        const startChar = this.getColLetter(nextCol);
        // Append headers
        await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Transactions (1065)!${startChar}1:append?valueInputOption=RAW`,
            'POST',
            { values: [newHeaders] }
        );

        // Refresh map
        await this.fetchHeaders();
    }

    async findFirstEmptyRow(): Promise<number> {
        if (!this.colMap) await this.fetchHeaders();
        // We check column A (Date) for emptiness.
        // But reading the whole column A is efficient? 
        // Yes, for 1000s of rows it's fine.

        const dateCol = this.getColLetter(this.colMap!.Date);
        const res = await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Transactions (1065)!${dateCol}2:${dateCol}5000`
        );

        const val = res.values;
        if (!val) return 2; // Empty sheet (just header)

        // Find first blank
        // val is array of arrays. e.g. [["2023-01-01"], ["2023-01-02"]]
        // Drive API returns results. If a cell is empty in the middle, it might return "" or just skip if "trailing".
        // But if we ask for A2:A5000, it returns the block of values.

        // Warning: if rows are deleted in middle, we might fill them? 
        // User requires: "Find the first empty row where 'Date' is blank, starting at row 2."
        // If usage is Append-only usually, then `val.length` + 2 is the index.

        return val.length + 2;
    }

    async appendExpense(data: any): Promise<void> {
        if (!this.colMap) await this.fetchHeaders();

        const rowIdx = await this.findFirstEmptyRow();

        // Construct row array. We must fill UP TO the max index we need.
        const maxIdx = Math.max(
            this.colMap!.ExpenseId || 0,
            this.colMap!.Updated || 0,
            this.colMap!.Amount // etc
        );

        const row = new Array(maxIdx + 1).fill('');

        if (this.colMap!.Date !== undefined) row[this.colMap!.Date] = data.date;
        if (this.colMap!.PropertyID !== undefined) row[this.colMap!.PropertyID] = data.propertyId;
        if (this.colMap!.Vendor !== undefined) row[this.colMap!.Vendor] = data.vendor;
        if (this.colMap!.Amount !== undefined) row[this.colMap!.Amount] = data.amount;
        if (this.colMap!.Category !== undefined) row[this.colMap!.Category] = data.category;
        if (this.colMap!.Class !== undefined) row[this.colMap!.Class] = data.class;
        if (this.colMap!.Is1099 !== undefined) row[this.colMap!.Is1099] = data.is1099;
        if (this.colMap!.PaidVia !== undefined) row[this.colMap!.PaidVia] = data.paidVia;
        if (this.colMap!.ReceiptLink !== undefined) row[this.colMap!.ReceiptLink] = `=HYPERLINK("${data.receiptLink}", "Receipt")`;
        if (this.colMap!.Notes !== undefined) row[this.colMap!.Notes] = data.notes;

        // Metadata
        if (this.colMap!.ExpenseId !== undefined) row[this.colMap!.ExpenseId] = data.id;
        if (this.colMap!.Member !== undefined) row[this.colMap!.Member] = data.member;
        if (this.colMap!.ReceiptFileId !== undefined) row[this.colMap!.ReceiptFileId] = data.fileId;
        if (this.colMap!.Status !== undefined) row[this.colMap!.Status] = 'Active';
        if (this.colMap!.Created !== undefined) row[this.colMap!.Created] = new Date().toISOString();
        if (this.colMap!.Updated !== undefined) row[this.colMap!.Updated] = new Date().toISOString();

        const range = `Transactions (1065)!A${rowIdx}`;

        await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
            'PUT',
            { values: [row] }
        );
    }

    async findRowByExpenseId(id: string): Promise<number | null> {
        if (!this.colMap) await this.fetchHeaders();
        if (this.colMap?.ExpenseId === undefined) return null;

        const colLetter = this.getColLetter(this.colMap.ExpenseId);
        // Fetch the whole column of IDs
        // TODO: Caching this might be good for performance if large sheet.
        const res = await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Transactions (1065)!${colLetter}2:${colLetter}5000`
        );

        const rows = res.values;
        if (!rows) return null;

        const idx = rows.findIndex((r: string[]) => r[0] === id);
        if (idx === -1) return null;

        return idx + 2; // +2 because 1-based index and header is row 1
    }

    async updateExpense(data: any): Promise<void> {
        if (!data.id) throw new Error('Cannot update expense without ID');
        if (!this.colMap) await this.fetchHeaders();

        const rowIdx = await this.findRowByExpenseId(data.id);
        if (!rowIdx) throw new Error('Expense ID not found in sheet');

        // We prepare a row, but we can't just overwrite the whole row if we want to preserve unknown columns?
        // But we allocated the row initially. 
        // Safer to update specific cells? BatchUpdate?
        // Or if we know the Schema is fixed by us, we overwrite the mapped columns.
        // Let's overwrite mapped columns. We construct the full row again based on mapping.

        const maxIdx = Math.max(
            this.colMap!.ExpenseId || 0,
            this.colMap!.Updated || 0,
            this.colMap!.Amount // etc
        );


        // Issue: Formula columns like Map8825Line.
        // We MUST NOT overwrite them.
        // We should only populate indices that are IN our map.
        // But `values.update` takes a contiguous array for a range.
        // If we have gaps, we can use `null` or `undefined` in JSON? Sheets API treats null as "do not change" ? 
        // Actually, `values.update` with `USER_ENTERED` overwrites. 
        // Better strategy: Read the existing row, merge our changes, write back.

        const rangeRead = `Transactions (1065)!A${rowIdx}:${this.getColLetter(maxIdx)}${rowIdx}`;
        const existingRes = await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${rangeRead}`
        );
        const existingRow = existingRes.values?.[0] || new Array(maxIdx + 1).fill('');

        // Update mapped fields
        if (this.colMap!.Date !== undefined) existingRow[this.colMap!.Date] = data.date;
        if (this.colMap!.PropertyID !== undefined) existingRow[this.colMap!.PropertyID] = data.propertyId;
        if (this.colMap!.Vendor !== undefined) existingRow[this.colMap!.Vendor] = data.vendor;
        if (this.colMap!.Amount !== undefined) existingRow[this.colMap!.Amount] = data.amount;
        if (this.colMap!.Category !== undefined) existingRow[this.colMap!.Category] = data.category;
        if (this.colMap!.Class !== undefined) existingRow[this.colMap!.Class] = data.class;
        if (this.colMap!.Is1099 !== undefined) existingRow[this.colMap!.Is1099] = data.is1099;
        if (this.colMap!.PaidVia !== undefined) existingRow[this.colMap!.PaidVia] = data.paidVia;
        if (this.colMap!.ReceiptLink !== undefined && data.receiptLink) existingRow[this.colMap!.ReceiptLink] = `=HYPERLINK("${data.receiptLink}", "Receipt")`;
        if (this.colMap!.Notes !== undefined) existingRow[this.colMap!.Notes] = data.notes;
        if (this.colMap!.Updated !== undefined) existingRow[this.colMap!.Updated] = new Date().toISOString();
        if (this.colMap!.Status !== undefined && data.status) existingRow[this.colMap!.Status] = data.status; // Support soft delete update

        await googleClient.request(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${rangeRead}?valueInputOption=USER_ENTERED`,
            'PUT',
            { values: [existingRow] }
        );
    }
    async getDropdowns() {
        if (!this.spreadsheetId) await this.init();

        const ranges = [
            "'Chart of Accounts'!A2:A",
            "'Properties'!A2:A",
            "'Vendors'!A2:A"
        ];

        try {
            console.log(`Fetching dropdowns from Sheet ID: ${this.spreadsheetId}`);
            const res = await googleClient.request(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}`
            );
            console.log('Raw BatchGet Response:', res);

            const valueRanges = res.valueRanges;
            // 0: Categories, 1: Properties, 2: Vendors

            const categories = valueRanges[0]?.values?.flat().filter(Boolean) || [];
            const properties = valueRanges[1]?.values?.flat().filter(Boolean) || [];
            const vendors = valueRanges[2]?.values?.flat().filter(Boolean) || [];

            return { categories, properties, vendors };
        } catch (e) {
            console.warn('Error fetching dropdowns', e);
            return { categories: [], properties: [], vendors: [] };
        }
    }
}

export const sheetService = new SheetService();
