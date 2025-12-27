import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getRows, appendRow, updateRowById, deleteRowById, deleteRowsByIds, generateId, SHEETS, AuthenticationError } from '../services/googleSheets';

const DataContext = createContext(null);
export const useData = () => { const context = useContext(DataContext); if (!context) throw new Error('useData must be used within a DataProvider'); return context; };

export const DataProvider = ({ children }) => {
  const { signOut } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [routineLogs, setRoutineLogs] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleAuthError = useCallback((error) => { if (error instanceof AuthenticationError) { console.error('Authentication error:', error.message); signOut(); return true; } return false; }, [signOut]);

  const loadData = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [tasksData, routinesData, routineLogsData, mainCatData, subCatData, tagsData] = await Promise.all([getRows(SHEETS.TASKS), getRows(SHEETS.ROUTINES), getRows(SHEETS.ROUTINE_LOGS), getRows(SHEETS.MAIN_CATEGORIES), getRows(SHEETS.SUB_CATEGORIES), getRows(SHEETS.TAGS)]);
      setTasks(tasksData.filter(t => t.title && t.title.trim() !== ''));
      setRoutines(routinesData.filter(r => r.title && r.title.trim() !== ''));
      setRoutineLogs(routineLogsData.filter(l => l.id && l.id.trim() !== ''));
      setMainCategories(mainCatData.filter(c => c.name && c.name.trim() !== ''));
      setSubCategories(subCatData.filter(c => c.name && c.name.trim() !== ''));
      setTags(tagsData.filter(t => t.name && t.name.trim() !== ''));
    } catch (err) { if (handleAuthError(err)) return; setError(err.message); console.error('Failed to load data:', err); }
    finally { setIsLoading(false); }
  }, [handleAuthError]);

  useEffect(() => { loadData(); }, [loadData]);

  const addTask = async (taskData) => {
    try {
      const id = generateId(); const now = new Date().toISOString();
      const newTask = { id, title: taskData.title || '', description: taskData.description || '', mainCategoryId: taskData.mainCategoryId || '', subCategoryId: taskData.subCategoryId || '', priority: taskData.priority || 'medium', status: taskData.status || 'todo', startDate: taskData.startDate || '', startTime: taskData.startTime || '', dueDate: taskData.dueDate || '', dueTime: taskData.dueTime || '', estimatedDays: taskData.estimatedDays || '', estimatedHours: taskData.estimatedHours || '', period: taskData.period || '', tags: taskData.tags || '', links: taskData.links || '[]', createdAt: now, updatedAt: now };
      const rowData = [newTask.id, newTask.title, newTask.description, newTask.mainCategoryId, newTask.subCategoryId, newTask.priority, newTask.status, newTask.startDate, newTask.startTime, newTask.dueDate, newTask.dueTime, newTask.estimatedDays, newTask.estimatedHours, newTask.period, newTask.tags, newTask.links, newTask.createdAt, newTask.updatedAt];
      await appendRow(SHEETS.TASKS, rowData); setTasks(prev => [...prev, newTask]); return newTask;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to add task:', err); throw err; }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const taskIndex = tasks.findIndex(t => t.id === taskId); if (taskIndex === -1) throw new Error('Task not found');
      const now = new Date().toISOString(); const updatedTask = { ...tasks[taskIndex], ...updates, updatedAt: now };
      const rowData = [updatedTask.id, updatedTask.title, updatedTask.description, updatedTask.mainCategoryId, updatedTask.subCategoryId, updatedTask.priority, updatedTask.status, updatedTask.startDate, updatedTask.startTime, updatedTask.dueDate, updatedTask.dueTime, updatedTask.estimatedDays, updatedTask.estimatedHours, updatedTask.period, updatedTask.tags, updatedTask.links, updatedTask.createdAt, updatedTask.updatedAt];
      await updateRowById(SHEETS.TASKS, taskId, rowData); setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t)); return updatedTask;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to update task:', err); throw err; }
  };

  const deleteTask = async (taskId) => { try { await deleteRowById(SHEETS.TASKS, taskId); setTasks(prev => prev.filter(t => t.id !== taskId)); } catch (err) { if (handleAuthError(err)) return; console.error('Failed to delete task:', err); throw err; } };

  const addRoutine = async (routineData) => {
    try {
      const id = generateId(); const now = new Date().toISOString();
      const newRoutine = { id, title: routineData.title || '', description: routineData.description || '', mainCategoryId: routineData.mainCategoryId || '', subCategoryId: routineData.subCategoryId || '', frequency: routineData.frequency || 'daily', dayOfWeek: routineData.dayOfWeek || '', dayOfMonth: routineData.dayOfMonth || '', isActive: routineData.isActive || 'TRUE', createdAt: now, updatedAt: now };
      const rowData = [newRoutine.id, newRoutine.title, newRoutine.description, newRoutine.mainCategoryId, newRoutine.subCategoryId, newRoutine.frequency, newRoutine.dayOfWeek, newRoutine.dayOfMonth, newRoutine.isActive, newRoutine.createdAt, newRoutine.updatedAt];
      await appendRow(SHEETS.ROUTINES, rowData); setRoutines(prev => [...prev, newRoutine]); return newRoutine;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to add routine:', err); throw err; }
  };

  const updateRoutine = async (routineId, updates) => {
    try {
      const routineIndex = routines.findIndex(r => r.id === routineId); if (routineIndex === -1) throw new Error('Routine not found');
      const now = new Date().toISOString(); const updatedRoutine = { ...routines[routineIndex], ...updates, updatedAt: now };
      const rowData = [updatedRoutine.id, updatedRoutine.title, updatedRoutine.description, updatedRoutine.mainCategoryId, updatedRoutine.subCategoryId, updatedRoutine.frequency, updatedRoutine.dayOfWeek, updatedRoutine.dayOfMonth, updatedRoutine.isActive, updatedRoutine.createdAt, updatedRoutine.updatedAt];
      await updateRowById(SHEETS.ROUTINES, routineId, rowData); setRoutines(prev => prev.map(r => r.id === routineId ? updatedRoutine : r)); return updatedRoutine;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to update routine:', err); throw err; }
  };

  const deleteRoutine = async (routineId) => {
    try {
      const relatedLogs = routineLogs.filter(log => log.routineId === routineId);
      if (relatedLogs.length > 0) { await deleteRowsByIds(SHEETS.ROUTINE_LOGS, relatedLogs.map(log => log.id)); setRoutineLogs(prev => prev.filter(log => log.routineId !== routineId)); }
      await deleteRowById(SHEETS.ROUTINES, routineId); setRoutines(prev => prev.filter(r => r.id !== routineId));
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to delete routine:', err); throw err; }
  };

  const addRoutineLog = async (logData) => {
    try {
      const id = generateId();
      const newLog = { id, routineId: logData.routineId, date: logData.date, completed: logData.completed || 'FALSE', completedAt: logData.completedAt || '' };
      const rowData = [newLog.id, newLog.routineId, newLog.date, newLog.completed, newLog.completedAt];
      await appendRow(SHEETS.ROUTINE_LOGS, rowData); setRoutineLogs(prev => [...prev, newLog]); return newLog;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to add routine log:', err); throw err; }
  };

  const updateRoutineLog = async (logId, updates) => {
    try {
      const logIndex = routineLogs.findIndex(l => l.id === logId); if (logIndex === -1) throw new Error('Routine log not found');
      const updatedLog = { ...routineLogs[logIndex], ...updates };
      const rowData = [updatedLog.id, updatedLog.routineId, updatedLog.date, updatedLog.completed, updatedLog.completedAt];
      await updateRowById(SHEETS.ROUTINE_LOGS, logId, rowData); setRoutineLogs(prev => prev.map(l => l.id === logId ? updatedLog : l)); return updatedLog;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to update routine log:', err); throw err; }
  };

  const addMainCategory = async (categoryData) => {
    try {
      const id = generateId(); const now = new Date().toISOString();
      const newCategory = { id, name: categoryData.name, color: categoryData.color || '#4A90D9', createdAt: now };
      await appendRow(SHEETS.MAIN_CATEGORIES, [newCategory.id, newCategory.name, newCategory.color, newCategory.createdAt]);
      setMainCategories(prev => [...prev, newCategory]); return newCategory;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to add main category:', err); throw err; }
  };

  const updateMainCategory = async (categoryId, updates) => {
    try {
      const catIndex = mainCategories.findIndex(c => c.id === categoryId); if (catIndex === -1) throw new Error('Category not found');
      const updatedCategory = { ...mainCategories[catIndex], ...updates };
      await updateRowById(SHEETS.MAIN_CATEGORIES, categoryId, [updatedCategory.id, updatedCategory.name, updatedCategory.color, updatedCategory.createdAt]);
      setMainCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c)); return updatedCategory;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to update main category:', err); throw err; }
  };

  const deleteMainCategory = async (categoryId) => {
    try {
      await deleteRowById(SHEETS.MAIN_CATEGORIES, categoryId); setMainCategories(prev => prev.filter(c => c.id !== categoryId));
      const relatedSubCats = subCategories.filter(sc => sc.mainCategoryId === categoryId);
      for (const subCat of relatedSubCats) await deleteRowById(SHEETS.SUB_CATEGORIES, subCat.id);
      setSubCategories(prev => prev.filter(c => c.mainCategoryId !== categoryId));
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to delete main category:', err); throw err; }
  };

  const addSubCategory = async (categoryData) => {
    try {
      const id = generateId(); const now = new Date().toISOString();
      const newCategory = { id, mainCategoryId: categoryData.mainCategoryId, name: categoryData.name, createdAt: now };
      await appendRow(SHEETS.SUB_CATEGORIES, [newCategory.id, newCategory.mainCategoryId, newCategory.name, newCategory.createdAt]);
      setSubCategories(prev => [...prev, newCategory]); return newCategory;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to add sub category:', err); throw err; }
  };

  const updateSubCategory = async (categoryId, updates) => {
    try {
      const catIndex = subCategories.findIndex(c => c.id === categoryId); if (catIndex === -1) throw new Error('Sub category not found');
      const updatedCategory = { ...subCategories[catIndex], ...updates };
      await updateRowById(SHEETS.SUB_CATEGORIES, categoryId, [updatedCategory.id, updatedCategory.mainCategoryId, updatedCategory.name, updatedCategory.createdAt]);
      setSubCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c)); return updatedCategory;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to update sub category:', err); throw err; }
  };

  const deleteSubCategory = async (categoryId) => { try { await deleteRowById(SHEETS.SUB_CATEGORIES, categoryId); setSubCategories(prev => prev.filter(c => c.id !== categoryId)); } catch (err) { if (handleAuthError(err)) return; console.error('Failed to delete sub category:', err); throw err; } };

  const addTag = async (tagData) => {
    try {
      const id = generateId(); const now = new Date().toISOString();
      const newTag = { id, name: tagData.name, color: tagData.color || '#6B7280', createdAt: now };
      await appendRow(SHEETS.TAGS, [newTag.id, newTag.name, newTag.color, newTag.createdAt]);
      setTags(prev => [...prev, newTag]); return newTag;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to add tag:', err); throw err; }
  };

  const updateTag = async (tagId, updates) => {
    try {
      const tagIndex = tags.findIndex(t => t.id === tagId); if (tagIndex === -1) throw new Error('Tag not found');
      const updatedTag = { ...tags[tagIndex], ...updates };
      await updateRowById(SHEETS.TAGS, tagId, [updatedTag.id, updatedTag.name, updatedTag.color, updatedTag.createdAt]);
      setTags(prev => prev.map(t => t.id === tagId ? updatedTag : t)); return updatedTag;
    } catch (err) { if (handleAuthError(err)) return; console.error('Failed to update tag:', err); throw err; }
  };

  const deleteTag = async (tagId) => { try { await deleteRowById(SHEETS.TAGS, tagId); setTags(prev => prev.filter(t => t.id !== tagId)); } catch (err) { if (handleAuthError(err)) return; console.error('Failed to delete tag:', err); throw err; } };

  const getMainCategory = (id) => mainCategories.find(c => c.id === id);
  const getSubCategory = (id) => subCategories.find(c => c.id === id);
  const getSubCategoriesByMain = (mainId) => subCategories.filter(c => c.mainCategoryId === mainId);

  const value = { tasks, routines, routineLogs, mainCategories, subCategories, tags, isLoading, error, addTask, updateTask, deleteTask, addRoutine, updateRoutine, deleteRoutine, addRoutineLog, updateRoutineLog, addMainCategory, updateMainCategory, deleteMainCategory, addSubCategory, updateSubCategory, deleteSubCategory, addTag, updateTag, deleteTag, getMainCategory, getSubCategory, getSubCategoriesByMain, refreshData: loadData };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
