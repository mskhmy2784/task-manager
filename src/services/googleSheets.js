// Google Sheets API Service
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Sheet names
export const SHEETS = {
  TASKS: 'Tasks',
  ROUTINES: 'Routines',
  ROUTINE_LOGS: 'RoutineLogs',
  MAIN_CATEGORIES: 'MainCategories',
  SUB_CATEGORIES: 'SubCategories',
  TAGS: 'Tags'
};

// Custom error class for authentication errors
export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Get access token with expiry check
const getAccessToken = () => {
  const token = localStorage.getItem('google_access_token');
  const expiry = localStorage.getItem('google_token_expiry');
  
  if (!token) {
    throw new AuthenticationError('No access token found');
  }
  
  // Check if token is expired
  if (expiry && Date.now() > parseInt(expiry)) {
    throw new AuthenticationError('Access token expired');
  }
  
  return token;
};

// Fetch with authentication and error handling
const fetchWithAuth = async (url, options = {}) => {
  const token = getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    throw new AuthenticationError('Authentication failed - please login again');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }
  
  return response.json();
};

// Get all rows from a sheet
export const getRows = async (sheetName) => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}`;
  const data = await fetchWithAuth(url);
  
  if (!data.values || data.values.length < 2) {
    return [];
  }
  
  const headers = data.values[0];
  const rows = data.values.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
};

// Append a new row
export const appendRow = async (sheetName, rowData) => {
  // First, get current data to find the next empty row
  const getUrl = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}`;
  const currentData = await fetchWithAuth(getUrl);
  
  const nextRow = (currentData.values?.length || 0) + 1;
  const range = `${sheetName}!A${nextRow}`;
  
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
  
  await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify({
      values: [rowData]
    }),
  });
  
  return rowData;
};

// Find row index by ID (searches in column A)
export const findRowIndexById = async (sheetName, id) => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}!A:A`;
  const data = await fetchWithAuth(url);
  
  if (!data.values) {
    return -1;
  }
  
  // Find the row index (0-based, but row 0 is header)
  for (let i = 1; i < data.values.length; i++) {
    if (data.values[i][0] === id) {
      return i; // Return 0-based index (includes header)
    }
  }
  
  return -1;
};

// Update a row by ID
export const updateRowById = async (sheetName, id, rowData) => {
  const rowIndex = await findRowIndexById(sheetName, id);
  
  if (rowIndex === -1) {
    throw new Error(`Row with ID ${id} not found in ${sheetName}`);
  }
  
  // rowIndex is 0-based, but sheets are 1-based, so add 1
  const range = `${sheetName}!A${rowIndex + 1}`;
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
  
  await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify({
      values: [rowData]
    }),
  });
  
  return rowData;
};

// Delete a row by ID
export const deleteRowById = async (sheetName, id) => {
  const rowIndex = await findRowIndexById(sheetName, id);
  
  if (rowIndex === -1) {
    throw new Error(`Row with ID ${id} not found in ${sheetName}`);
  }
  
  // Get sheet ID
  const metaUrl = `${API_BASE}/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`;
  const metaData = await fetchWithAuth(metaUrl);
  
  const sheet = metaData.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet ${sheetName} not found`);
  }
  
  const sheetId = sheet.properties.sheetId;
  
  // Delete the row
  const deleteUrl = `${API_BASE}/${SPREADSHEET_ID}:batchUpdate`;
  await fetchWithAuth(deleteUrl, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      }]
    }),
  });
};

// Delete multiple rows by IDs (deletes from bottom to top to avoid index shifting)
export const deleteRowsByIds = async (sheetName, ids) => {
  if (!ids || ids.length === 0) return;
  
  // Get all row indices first
  const rowIndices = [];
  for (const id of ids) {
    const rowIndex = await findRowIndexById(sheetName, id);
    if (rowIndex !== -1) {
      rowIndices.push(rowIndex);
    }
  }
  
  if (rowIndices.length === 0) return;
  
  // Sort indices in descending order to delete from bottom to top
  rowIndices.sort((a, b) => b - a);
  
  // Get sheet ID
  const metaUrl = `${API_BASE}/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`;
  const metaData = await fetchWithAuth(metaUrl);
  
  const sheet = metaData.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet ${sheetName} not found`);
  }
  
  const sheetId = sheet.properties.sheetId;
  
  // Create delete requests for each row
  const requests = rowIndices.map(rowIndex => ({
    deleteDimension: {
      range: {
        sheetId: sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex,
        endIndex: rowIndex + 1
      }
    }
  }));
  
  // Execute batch delete
  const deleteUrl = `${API_BASE}/${SPREADSHEET_ID}:batchUpdate`;
  await fetchWithAuth(deleteUrl, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
};

// Legacy functions for backward compatibility
export const updateRow = async (sheetName, index, rowData) => {
  const range = `${sheetName}!A${index + 2}`;
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
  
  await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify({
      values: [rowData]
    }),
  });
  
  return rowData;
};

export const deleteRow = async (sheetName, index) => {
  const metaUrl = `${API_BASE}/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`;
  const metaData = await fetchWithAuth(metaUrl);
  
  const sheet = metaData.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet ${sheetName} not found`);
  }
  
  const sheetId = sheet.properties.sheetId;
  const rowIndex = index + 1;
  
  const url = `${API_BASE}/${SPREADSHEET_ID}:batchUpdate`;
  await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      }]
    }),
  });
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
