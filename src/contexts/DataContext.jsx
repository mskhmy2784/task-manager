import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getSheetData,
  appendRow,
  updateRowById,
  deleteRowById,
  deleteRowsByIds,
  SHEETS,
  generateId,
  formatDateTime,
  AuthenticationError
} from '../services/googleSheets';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { isAuthenticated, signOut } = useAuth();
  
  // Data state
  const [tasks, setTasks] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [routineLogs, setRoutineLogs] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [tags, setTags] = useState([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle authentication errors
  const handleAuthError = useCallback((err) => {
    if (err instanceof AuthenticationError) {
      console.error('Authentication error:', err.message);
      signOut();
      return true;
    }
    return false;
  }, [signOut]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [
        tasksData,
        routinesData,
        routineLogsData,
        mainCategoriesData,
        subCategoriesData,
        tagsData
      ] = await Promise.all([
        getSheetData(SHEETS.TASKS),
        getSheetData(SHEETS.ROUTINES),
        getSheetData(SHEETS.ROUTINE_LOGS),
        getSheetData(SHEETS.MAIN_CATEGORIES),
        getSheetData(SHEETS.SUB_CATEGORIES),
        getSheetData(SHEETS.TAGS)
      ]);
      
      setTasks(tasksData.filter(t => t.title && t.title.trim() !== ''));
      setRoutines(routinesData.filter(r => r.title && r.title.trim() !== ''));
      setRoutineLogs(routineLogsData);
      setMainCategories(mainCategoriesData.filter(c => c.name && c.name.trim() !== ''));
      setSubCategories(subCategoriesData.filter(c => c.name && c.name.trim() !== ''));
      setTags(tagsData.filter(t => t.name && t.name.trim() !== ''));
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, handleAuthError]);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  // === Task Operations ===
  
  const addTask = async (taskData) => {
    const newTask = {
      id: generateId('task'),
      ...taskData,
      status: taskData.status || 'todo',
      createdAt: formatDateTime(new Date()),
      completedAt: ''
    };
    
    try {
      await appendRow(SHEETS.TASKS, newTask);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const updateTask = async (taskId, updates) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    
    const updatedTask = { ...task, ...updates };
    
    // If marking as done, set completedAt
    if (updates.status === 'done' && task.status !== 'done') {
      updatedTask.completedAt = formatDateTime(new Date());
    }
    
    try {
      await updateRowById(SHEETS.TASKS, taskId, updatedTask);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const deleteTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    
    try {
      await deleteRowById(SHEETS.TASKS, taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  // === Routine Operations ===
  
  const addRoutine = async (routineData) => {
    const newRoutine = {
      id: generateId('routine'),
      ...routineData,
      isActive: 'TRUE',
      createdAt: formatDateTime(new Date())
    };
    
    try {
      await appendRow(SHEETS.ROUTINES, newRoutine);
      setRoutines(prev => [...prev, newRoutine]);
      return newRoutine;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const updateRoutine = async (routineId, updates) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) throw new Error('Routine not found');
    
    const updatedRoutine = { ...routine, ...updates };
    
    try {
      await updateRowById(SHEETS.ROUTINES, routineId, updatedRoutine);
      setRoutines(prev => prev.map(r => r.id === routineId ? updatedRoutine : r));
      return updatedRoutine;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const deleteRoutine = async (routineId) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) throw new Error('Routine not found');
    
    try {
      // Delete related routine logs first
      const relatedLogIds = routineLogs
        .filter(log => log.routineId === routineId)
        .map(log => log.id);
      
      if (relatedLogIds.length > 0) {
        await deleteRowsByIds(SHEETS.ROUTINE_LOGS, relatedLogIds);
      }
      setRoutineLogs(prev => prev.filter(log => log.routineId !== routineId));
      
      // Then delete the routine itself
      await deleteRowById(SHEETS.ROUTINES, routineId);
      setRoutines(prev => prev.filter(r => r.id !== routineId));
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  // === Routine Log Operations ===
  
  const addRoutineLog = async (logData) => {
    const newLog = {
      id: generateId('log'),
      ...logData,
      completedAt: logData.status === 'done' ? formatDateTime(new Date()) : ''
    };
    
    try {
      await appendRow(SHEETS.ROUTINE_LOGS, newLog);
      setRoutineLogs(prev => [...prev, newLog]);
      return newLog;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const updateRoutineLog = async (logId, updates) => {
    const log = routineLogs.find(l => l.id === logId);
    if (!log) throw new Error('Log not found');
    
    const updatedLog = { ...log, ...updates };
    if (updates.status === 'done' && log.status !== 'done') {
      updatedLog.completedAt = formatDateTime(new Date());
    }
    
    try {
      await updateRowById(SHEETS.ROUTINE_LOGS, logId, updatedLog);
      setRoutineLogs(prev => prev.map(l => l.id === logId ? updatedLog : l));
      return updatedLog;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  // === Tag Operations ===
  
  const addTag = async (tagData) => {
    const newTag = {
      id: generateId('tag'),
      name: tagData.name,
      color: tagData.color || '#9E9E9E',
      createdAt: formatDateTime(new Date())
    };
    
    try {
      await appendRow(SHEETS.TAGS, newTag);
      setTags(prev => [...prev, newTag]);
      return newTag;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const updateTag = async (tagId, updates) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) throw new Error('Tag not found');
    
    const updatedTag = { ...tag, ...updates };
    
    try {
      await updateRowById(SHEETS.TAGS, tagId, updatedTag);
      setTags(prev => prev.map(t => t.id === tagId ? updatedTag : t));
      return updatedTag;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const deleteTag = async (tagId) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) throw new Error('Tag not found');
    
    try {
      // Remove tag from all tasks
      const tasksWithTag = tasks.filter(t => t.tags?.includes(tagId));
      for (const task of tasksWithTag) {
        const newTags = task.tags.split(',').filter(id => id !== tagId).join(',');
        await updateTask(task.id, { tags: newTags });
      }
      
      // Remove tag from all routines
      const routinesWithTag = routines.filter(r => r.tags?.includes(tagId));
      for (const routine of routinesWithTag) {
        const newTags = routine.tags.split(',').filter(id => id !== tagId).join(',');
        await updateRoutine(routine.id, { tags: newTags });
      }
      
      await deleteRowById(SHEETS.TAGS, tagId);
      setTags(prev => prev.filter(t => t.id !== tagId));
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  // Find or create tag by name
  const findOrCreateTag = async (tagName) => {
    const existingTag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (existingTag) return existingTag;
    return await addTag({ name: tagName });
  };

  // === Category Operations ===
  
  const addMainCategory = async (categoryData) => {
    const newCategory = {
      id: generateId('main'),
      ...categoryData,
      sortOrder: mainCategories.length + 1
    };
    
    try {
      await appendRow(SHEETS.MAIN_CATEGORIES, newCategory);
      setMainCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const addSubCategory = async (categoryData) => {
    const newCategory = {
      id: generateId('sub'),
      ...categoryData,
      sortOrder: subCategories.filter(s => s.mainCategoryId === categoryData.mainCategoryId).length + 1
    };
    
    try {
      await appendRow(SHEETS.SUB_CATEGORIES, newCategory);
      setSubCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const updateMainCategory = async (categoryId, updates) => {
    const category = mainCategories.find(c => c.id === categoryId);
    if (!category) throw new Error('Category not found');
    
    const updatedCategory = { ...category, ...updates };
    
    try {
      await updateRowById(SHEETS.MAIN_CATEGORIES, categoryId, updatedCategory);
      setMainCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
      return updatedCategory;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const deleteMainCategory = async (categoryId) => {
    const category = mainCategories.find(c => c.id === categoryId);
    if (!category) throw new Error('Category not found');
    
    try {
      await deleteRowById(SHEETS.MAIN_CATEGORIES, categoryId);
      setMainCategories(prev => prev.filter(c => c.id !== categoryId));
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const updateSubCategory = async (categoryId, updates) => {
    const category = subCategories.find(c => c.id === categoryId);
    if (!category) throw new Error('SubCategory not found');
    
    const updatedCategory = { ...category, ...updates };
    
    try {
      await updateRowById(SHEETS.SUB_CATEGORIES, categoryId, updatedCategory);
      setSubCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
      return updatedCategory;
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  const deleteSubCategory = async (categoryId) => {
    const category = subCategories.find(c => c.id === categoryId);
    if (!category) throw new Error('SubCategory not found');
    
    try {
      await deleteRowById(SHEETS.SUB_CATEGORIES, categoryId);
      setSubCategories(prev => prev.filter(c => c.id !== categoryId));
    } catch (err) {
      if (handleAuthError(err)) throw err;
      throw err;
    }
  };

  // === Helper Functions ===
  
  const getMainCategory = (id) => mainCategories.find(c => c.id === id);
  const getSubCategory = (id) => subCategories.find(c => c.id === id);
  const getTag = (id) => tags.find(t => t.id === id);
  
  const getSubCategoriesForMain = (mainCategoryId) => 
    subCategories.filter(s => s.mainCategoryId === mainCategoryId);

  const value = {
    // Data
    tasks,
    routines,
    routineLogs,
    mainCategories,
    subCategories,
    tags,
    
    // State
    isLoading,
    error,
    
    // Actions
    fetchAllData,
    
    // Task operations
    addTask,
    updateTask,
    deleteTask,
    
    // Routine operations
    addRoutine,
    updateRoutine,
    deleteRoutine,
    addRoutineLog,
    updateRoutineLog,
    
    // Tag operations
    addTag,
    updateTag,
    deleteTag,
    findOrCreateTag,
    
    // Category operations
    addMainCategory,
    updateMainCategory,
    deleteMainCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    
    // Helpers
    getMainCategory,
    getSubCategory,
    getTag,
    getSubCategoriesForMain
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
