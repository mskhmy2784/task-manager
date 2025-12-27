const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export const SHEETS = { TASKS: 'Tasks', ROUTINES: 'Routines', ROUTINE_LOGS: 'RoutineLogs', MAIN_CATEGORIES: 'MainCategories', SUB_CATEGORIES: 'SubCategories', TAGS: 'Tags' };

export class AuthenticationError extends Error { constructor(message) { super(message); this.name = 'AuthenticationError'; } }

const getAccessToken = () => {
  const token = localStorage.getItem('google_access_token');
  const expiry = localStorage.getItem('google_token_expiry');
  if (!token) throw new AuthenticationError('No access token found');
  if (expiry && Date.now() > parseInt(expiry)) throw new AuthenticationError('Access token expired');
  return token;
};

const fetchWithAuth = async (url, options = {}) => {
  const token = getAccessToken();
  const response = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (response.status === 401 || response.status === 403) throw new AuthenticationError('Authentication failed - please login again');
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.error?.message || `API Error: ${response.status}`); }
  return response.json();
};

export const getRows = async (sheetName) => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}`;
  const data = await fetchWithAuth(url);
  if (!data.values || data.values.length < 2) return [];
  const headers = data.values[0];
  return data.values.slice(1).map(row => { const obj = {}; headers.forEach((header, index) => { obj[header] = row[index] || ''; }); return obj; });
};

export const appendRow = async (sheetName, rowData) => {
  const getUrl = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}`;
  const currentData = await fetchWithAuth(getUrl);
  const nextRow = (currentData.values?.length || 0) + 1;
  const range = `${sheetName}!A${nextRow}`;
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
  await fetchWithAuth(url, { method: 'PUT', body: JSON.stringify({ values: [rowData] }) });
  return rowData;
};

export const findRowIndexById = async (sheetName, id) => {
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${sheetName}!A:A`;
  const data = await fetchWithAuth(url);
  if (!data.values) return -1;
  for (let i = 1; i < data.values.length; i++) { if (data.values[i][0] === id) return i; }
  return -1;
};

export const updateRowById = async (sheetName, id, rowData) => {
  const rowIndex = await findRowIndexById(sheetName, id);
  if (rowIndex === -1) throw new Error(`Row with ID ${id} not found in ${sheetName}`);
  const range = `${sheetName}!A${rowIndex + 1}`;
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
  await fetchWithAuth(url, { method: 'PUT', body: JSON.stringify({ values: [rowData] }) });
  return rowData;
};

export const deleteRowById = async (sheetName, id) => {
  const rowIndex = await findRowIndexById(sheetName, id);
  if (rowIndex === -1) throw new Error(`Row with ID ${id} not found in ${sheetName}`);
  const metaUrl = `${API_BASE}/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`;
  const metaData = await fetchWithAuth(metaUrl);
  const sheet = metaData.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  const sheetId = sheet.properties.sheetId;
  const deleteUrl = `${API_BASE}/${SPREADSHEET_ID}:batchUpdate`;
  await fetchWithAuth(deleteUrl, { method: 'POST', body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }] }) });
};

export const deleteRowsByIds = async (sheetName, ids) => {
  if (!ids || ids.length === 0) return;
  const rowIndices = [];
  for (const id of ids) { const rowIndex = await findRowIndexById(sheetName, id); if (rowIndex !== -1) rowIndices.push(rowIndex); }
  if (rowIndices.length === 0) return;
  rowIndices.sort((a, b) => b - a);
  const metaUrl = `${API_BASE}/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`;
  const metaData = await fetchWithAuth(metaUrl);
  const sheet = metaData.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  const sheetId = sheet.properties.sheetId;
  const requests = rowIndices.map(rowIndex => ({ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }));
  const deleteUrl = `${API_BASE}/${SPREADSHEET_ID}:batchUpdate`;
  await fetchWithAuth(deleteUrl, { method: 'POST', body: JSON.stringify({ requests }) });
};

export const updateRow = async (sheetName, index, rowData) => {
  const range = `${sheetName}!A${index + 2}`;
  const url = `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
  await fetchWithAuth(url, { method: 'PUT', body: JSON.stringify({ values: [rowData] }) });
  return rowData;
};

export const deleteRow = async (sheetName, index) => {
  const metaUrl = `${API_BASE}/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`;
  const metaData = await fetchWithAuth(metaUrl);
  const sheet = metaData.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  const sheetId = sheet.properties.sheetId;
  const rowIndex = index + 1;
  const url = `${API_BASE}/${SPREADSHEET_ID}:batchUpdate`;
  await fetchWithAuth(url, { method: 'POST', body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }] }) });
};

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
