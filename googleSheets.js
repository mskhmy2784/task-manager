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

// Get access token from stored auth
const getAccessToken = () => {
  const token = localStorage.getItem('google_access_token');
  if (!token) {
    throw new AuthenticationError('Not authenticated');
  }
  
  // Check token expiry
  const expiry = localStorage.getItem('google_token_expiry');
  if (expiry && Date.now() >= parseInt(expiry)) {
    throw new AuthenticationError('Token expired');
  }
  
  return token;
};

// Generic fetch with auth
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
  
  if (!response.ok) {
    // Handle authentication errors (401, 403)
    if (response.status === 401 || response.status === 403) {
      // Clear invalid token
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_token_expiry');
      throw new AuthenticationError('Session expired. Please sign in again.');
    }
    
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }
  
  return response.json();
};

// Get all data from a sheet
export const getSheetData = async (sheetName) => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}`;
  const data = await fetchWithAuth(url);
  
  if (!data.values || data.values.length === 0) {
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

// Get sheet headers
export const getSheetHeaders = async (sheetName) => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}!1:1`;
  const data = await fetchWithAuth(url);
  return data.values ? data.values[0] : [];
};

// Find row index by ID (returns the actual spreadsheet row number, 0-indexed from data rows)
export const findRowIndexById = async (sheetName, id, idColumn = 'id') => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}`;
  const data = await fetchWithAuth(url);
  
  if (!data.values || data.values.length === 0) {
    return -1;
  }
  
  const headers = data.values[0];
  const idColumnIndex = headers.indexOf(idColumn);
  
  if (idColumnIndex === -1) {
    throw new Error(`Column '${idColumn}' not found in sheet '${sheetName}'`);
  }
  
  // Search through all rows (starting from row 1, which is index 1 in the array)
  for (let i = 1; i < data.values.length; i++) {
    if (data.values[i][idColumnIndex] === id) {
      return i - 1; // Return 0-indexed row number (excluding header)
    }
  }
  
  return -1; // Not found
};

// Append a row to a sheet
export const appendRow = async (sheetName, rowData) => {
  // Get headers first to ensure correct column order
  const headers = await getSheetHeaders(sheetName);
  const values = [headers.map(header => rowData[header] || '')];
  
  // Get all data to find the next empty row
  const allDataUrl = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}!A:A`;
  const allData = await fetchWithAuth(allDataUrl);
  const nextRow = (allData.values ? allData.values.length : 1) + 1;
  
  // Write directly to the specific row starting from column A
  const lastCol = String.fromCharCode(64 + headers.length);
  const range = `${sheetName}!A${nextRow}:${lastCol}${nextRow}`;
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  });
  
  return response;
};

// Update a specific row by index (legacy - kept for compatibility)
export const updateRow = async (sheetName, rowIndex, rowData) => {
  const headers = await getSheetHeaders(sheetName);
  const range = `${sheetName}!A${rowIndex + 2}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex + 2}`;
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const values = [headers.map(header => rowData[header] || '')];
  
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  });
  
  return response;
};

// Update a row by ID (recommended)
export const updateRowById = async (sheetName, id, rowData, idColumn = 'id') => {
  const rowIndex = await findRowIndexById(sheetName, id, idColumn);
  
  if (rowIndex === -1) {
    throw new Error(`Record with ${idColumn}='${id}' not found in sheet '${sheetName}'`);
  }
  
  return updateRow(sheetName, rowIndex, rowData);
};

// Delete a row by index (legacy - kept for compatibility)
export const deleteRow = async (sheetName, rowIndex) => {
  // Get sheet ID first
  const spreadsheet = await fetchWithAuth(`${API_BASE}/${SPREADSHEET_ID}`);
  const sheet = spreadsheet.sheets.find(s => s.properties.title === sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet ${sheetName} not found`);
  }
  
  const sheetId = sheet.properties.sheetId;
  
  const url = `${API_BASE}/${SPREADSHEET_ID}:batchUpdate`;
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex + 1, // +1 for header
            endIndex: rowIndex + 2
          }
        }
      }]
    }),
  });
  
  return response;
};

// Delete a row by ID (recommended)
export const deleteRowById = async (sheetName, id, idColumn = 'id') => {
  const rowIndex = await findRowIndexById(sheetName, id, idColumn);
  
  if (rowIndex === -1) {
    throw new Error(`Record with ${idColumn}='${id}' not found in sheet '${sheetName}'`);
  }
  
  return deleteRow(sheetName, rowIndex);
};

// Delete multiple rows by IDs (deletes from back to front to avoid index shift)
export const deleteRowsByIds = async (sheetName, ids, idColumn = 'id') => {
  // Find all row indices first
  const rowIndices = [];
  for (const id of ids) {
    const rowIndex = await findRowIndexById(sheetName, id, idColumn);
    if (rowIndex !== -1) {
      rowIndices.push({ id, rowIndex });
    }
  }
  
  // Sort by rowIndex descending (delete from back to front)
  rowIndices.sort((a, b) => b.rowIndex - a.rowIndex);
  
  // Delete each row
  for (const { rowIndex } of rowIndices) {
    await deleteRow(sheetName, rowIndex);
  }
  
  return rowIndices.length;
};

// Batch update multiple cells
export const batchUpdate = async (updates) => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values:batchUpdate`;
  
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updates.map(update => ({
        range: update.range,
        values: update.values
      }))
    }),
  });
  
  return response;
};

// Generate unique ID
export const generateId = (prefix) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}${random}`;
};

// Format date for sheets
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Format datetime for sheets
export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19);
};

// Parse JSON safely
export const parseJSON = (str, defaultValue = []) => {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

// Stringify for storage
export const stringifyJSON = (obj) => {
  return JSON.stringify(obj);
};
