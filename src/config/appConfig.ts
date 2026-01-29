export const config = {
    spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID,
    driveFolderId: import.meta.env.VITE_DRIVE_FOLDER_ID,
    repoName: import.meta.env.VITE_REPO_NAME,
    allowedEmail: 'samurban2364@gmail.com', // Default allowlist
    scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
    ]
};
