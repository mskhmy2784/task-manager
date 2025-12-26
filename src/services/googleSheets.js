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

// Get access token from stored auth
const getAccessToken = () => {
  const token = localStorage.getItem('google_access_token');
  if (!token) {
    throw new Error('Not authenticated');
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

// Update a specific row
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

// Delete a row (by clearing it and then removing)
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

// Get sheet headers
export const getSheetHeaders = async (sheetName) => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}!1:1`;
  const data = await fetchWithAuth(url);
  return data.values ? data.values[0] : [];
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
