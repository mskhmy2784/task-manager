import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getSheetData,
  appendRow,
  updateRow,
  deleteRow,
  SHEETS,
  generateId,
  formatDateTime
} from '../services/googleSheets';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
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
      setError(err.message);
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

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
    
    await appendRow(SHEETS.TASKS, newTask);
    setTasks(prev => [...prev, newTask]);
    return newTask;
  };

  const updateTask = async (taskId, updates) => {
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');
    
    const updatedTask = { ...tasks[index], ...updates };
    
    // If marking as done, set completedAt
    if (updates.status === 'done' && tasks[index].status !== 'done') {
      updatedTask.completedAt = formatDateTime(new Date());
    }
    
    await updateRow(SHEETS.TASKS, index, updatedTask);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    return updatedTask;
  };

  const deleteTask = async (taskId) => {
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');
    
    await deleteRow(SHEETS.TASKS, index);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // === Routine Operations ===
  
  const addRoutine = async (routineData) => {
    const newRoutine = {
      id: generateId('routine'),
      ...routineData,
      isActive: 'TRUE',
      createdAt: formatDateTime(new Date())
    };
    
    await appendRow(SHEETS.ROUTINES, newRoutine);
    setRoutines(prev => [...prev, newRoutine]);
    return newRoutine;
  };

  const updateRoutine = async (routineId, updates) => {
    const index = routines.findIndex(r => r.id === routineId);
    if (index === -1) throw new Error('Routine not found');
    
    const updatedRoutine = { ...routines[index], ...updates };
    await updateRow(SHEETS.ROUTINES, index, updatedRoutine);
    setRoutines(prev => prev.map(r => r.id === routineId ? updatedRoutine : r));
    return updatedRoutine;
  };

  const deleteRoutine = async (routineId) => {
    const index = routines.findIndex(r => r.id === routineId);
    if (index === -1) throw new Error('Routine not found');
    
    await deleteRow(SHEETS.ROUTINES, index);
    setRoutines(prev => prev.filter(r => r.id !== routineId));
  };

  // === Routine Log Operations ===
  
  const addRoutineLog = async (logData) => {
    const newLog = {
      id: generateId('log'),
      ...logData,
      completedAt: logData.status === 'done' ? formatDateTime(new Date()) : ''
    };
    
    await appendRow(SHEETS.ROUTINE_LOGS, newLog);
    setRoutineLogs(prev => [...prev, newLog]);
    return newLog;
  };

  const updateRoutineLog = async (logId, updates) => {
    const index = routineLogs.findIndex(l => l.id === logId);
    if (index === -1) throw new Error('Log not found');
    
    const updatedLog = { ...routineLogs[index], ...updates };
    if (updates.status === 'done' && routineLogs[index].status !== 'done') {
      updatedLog.completedAt = formatDateTime(new Date());
    }
    
    await updateRow(SHEETS.ROUTINE_LOGS, index, updatedLog);
    setRoutineLogs(prev => prev.map(l => l.id === logId ? updatedLog : l));
    return updatedLog;
  };

  // === Tag Operations ===
  
  const addTag = async (tagData) => {
    const newTag = {
      id: generateId('tag'),
      name: tagData.name,
      color: tagData.color || '#9E9E9E',
      createdAt: formatDateTime(new Date())
    };
    
    await appendRow(SHEETS.TAGS, newTag);
    setTags(prev => [...prev, newTag]);
    return newTag;
  };

  const updateTag = async (tagId, updates) => {
    const index = tags.findIndex(t => t.id === tagId);
    if (index === -1) throw new Error('Tag not found');
    
    const updatedTag = { ...tags[index], ...updates };
    await updateRow(SHEETS.TAGS, index, updatedTag);
    setTags(prev => prev.map(t => t.id === tagId ? updatedTag : t));
    return updatedTag;
  };

  const deleteTag = async (tagId) => {
    const index = tags.findIndex(t => t.id === tagId);
    if (index === -1) throw new Error('Tag not found');
    
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
    
    await deleteRow(SHEETS.TAGS, index);
    setTags(prev => prev.filter(t => t.id !== tagId));
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
    
    await appendRow(SHEETS.MAIN_CATEGORIES, newCategory);
    setMainCategories(prev => [...prev, newCategory]);
    return newCategory;
  };

  const addSubCategory = async (categoryData) => {
    const newCategory = {
      id: generateId('sub'),
      ...categoryData,
      sortOrder: subCategories.filter(s => s.mainCategoryId === categoryData.mainCategoryId).length + 1
    };
    
    await appendRow(SHEETS.SUB_CATEGORIES, newCategory);
    setSubCategories(prev => [...prev, newCategory]);
    return newCategory;
  };

  const updateMainCategory = async (categoryId, updates) => {
    const index = mainCategories.findIndex(c => c.id === categoryId);
    if (index === -1) throw new Error('Category not found');
    
    const updatedCategory = { ...mainCategories[index], ...updates };
    await updateRow(SHEETS.MAIN_CATEGORIES, index, updatedCategory);
    setMainCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
    return updatedCategory;
  };

  const deleteMainCategory = async (categoryId) => {
    const index = mainCategories.findIndex(c => c.id === categoryId);
    if (index === -1) throw new Error('Category not found');
    
    await deleteRow(SHEETS.MAIN_CATEGORIES, index);
    setMainCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const updateSubCategory = async (categoryId, updates) => {
    const index = subCategories.findIndex(c => c.id === categoryId);
    if (index === -1) throw new Error('SubCategory not found');
    
    const updatedCategory = { ...subCategories[index], ...updates };
    await updateRow(SHEETS.SUB_CATEGORIES, index, updatedCategory);
    setSubCategories(prev => prev.map(c => c.id === categoryId ? updatedCategory : c));
    return updatedCategory;
  };

  const deleteSubCategory = async (categoryId) => {
    const index = subCategories.findIndex(c => c.id === categoryId);
    if (index === -1) throw new Error('SubCategory not found');
    
    await deleteRow(SHEETS.SUB_CATEGORIES, index);
    setSubCategories(prev => prev.filter(c => c.id !== categoryId));
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
