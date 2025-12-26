import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { format } from 'date-fns';
import {
  Plus,
  Filter,
  X,
  ArrowUpDown,
  Search,
  CheckSquare,
  Square,
  Trash2
} from 'lucide-react';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import './TaskListPage.css';

const TaskListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    tasks,
    mainCategories,
    tags,
    deleteTask,
    isLoading
  } = useData();

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    mainCategoryId: '',
    priority: '',
    status: '',
    tagId: ''
  });
  const [specialFilter, setSpecialFilter] = useState(''); // 'incomplete', 'overdue', 'onHold'
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Handle URL parameters
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setSpecialFilter(filterParam);
      setShowFilters(true);
      // Clear URL param after applying
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Exit selection mode when no tasks are selected
  useEffect(() => {
    if (selectionMode && selectedTasks.size === 0) {
      // Keep selection mode active even if nothing is selected
    }
  }, [selectedTasks, selectionMode]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    // Filter out tasks without title
    let result = tasks.filter(task => task.title && task.title.trim() !== '');

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.mainCategoryId) {
      result = result.filter(task => task.mainCategoryId === filters.mainCategoryId);
    }

    // Priority filter
    if (filters.priority) {
      result = result.filter(task => task.priority === filters.priority);
    }

    // Status filter
    if (filters.status) {
      result = result.filter(task => task.status === filters.status);
    }

    // Tag filter
    if (filters.tagId) {
      result = result.filter(task => {
        if (!task.tags) return false;
        const taskTags = task.tags.split(',');
        return taskTags.includes(filters.tagId);
      });
    }

    // Special filters (from dashboard)
    if (specialFilter === 'incomplete') {
      // 未完了: status が done, onHold 以外
      result = result.filter(task => task.status !== 'done' && task.status !== 'onHold');
    } else if (specialFilter === 'overdue') {
      // 期限超過: 期限日 < 今日 AND 未完了
      result = result.filter(task => 
        task.dueDate && 
        task.dueDate < todayStr && 
        task.status !== 'done'
      );
    } else if (specialFilter === 'onHold') {
      // 保留中
      result = result.filter(task => task.status === 'onHold');
    }

    // Sort
    result.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'dueDate':
          // Empty dates go to end
          if (!a.dueDate && !b.dueDate) compareValue = 0;
          else if (!a.dueDate) compareValue = 1;
          else if (!b.dueDate) compareValue = -1;
          else compareValue = a.dueDate.localeCompare(b.dueDate);
          break;
        case 'priority':
          const priorityOrder = { veryHigh: 0, high: 1, medium: 2, low: 3 };
          compareValue = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
          break;
        case 'status':
          const statusOrder = { todo: 0, inProgress: 1, onHold: 2, done: 3 };
          compareValue = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        case 'title':
          compareValue = (a.title || '').localeCompare(b.title || '');
          break;
        case 'createdAt':
          compareValue = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [tasks, searchQuery, filters, specialFilter, sortBy, sortOrder, todayStr]);

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleCopyTask = (task) => {
    const copiedTask = {
      ...task,
      id: undefined,
      title: `${task.title} (コピー)`,
      status: 'todo',
      completedAt: ''
    };
    setEditingTask(copiedTask);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  const clearFilters = () => {
    setFilters({
      mainCategoryId: '',
      priority: '',
      status: '',
      tagId: ''
    });
    setSpecialFilter('');
    setSearchQuery('');
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Selection mode handlers
  const toggleSelectionMode = () => {
    if (selectionMode) {
      // Exit selection mode
      setSelectionMode(false);
      setSelectedTasks(new Set());
    } else {
      // Enter selection mode
      setSelectionMode(true);
      setSelectedTasks(new Set());
    }
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const selectAllTasks = () => {
    if (selectedTasks.size === filteredTasks.length) {
      // Deselect all
      setSelectedTasks(new Set());
    } else {
      // Select all
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    
    const confirmMessage = `${selectedTasks.size}件のタスクを削除しますか？`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      // Delete tasks one by one
      const taskIds = Array.from(selectedTasks);
      for (const taskId of taskIds) {
        await deleteTask(taskId);
      }
      
      // Clear selection and exit selection mode
      setSelectedTasks(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Failed to delete tasks:', error);
      alert('タスクの削除中にエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = filters.mainCategoryId || filters.priority || filters.status || filters.tagId || searchQuery || specialFilter;

  const specialFilterLabels = {
    incomplete: '未完了タスク',
    overdue: '期限超過タスク',
    onHold: '保留中タスク'
  };

  const statusLabels = {
    todo: '未着手',
    inProgress: '進行中',
    done: '完了',
    onHold: '保留'
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="task-list-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-top">
          <h1>タスク一覧</h1>
          <div className="header-actions">
            <button 
              className={`selection-mode-btn ${selectionMode ? 'active' : ''}`}
              onClick={toggleSelectionMode}
            >
              <CheckSquare size={18} />
              <span>{selectionMode ? '選択解除' : '選択'}</span>
            </button>
            <button className="add-task-btn" onClick={() => setShowModal(true)}>
              <Plus size={20} />
              <span>新規タスク</span>
            </button>
          </div>
        </div>

        {/* Selection Mode Bar */}
        {selectionMode && (
          <div className="selection-bar">
            <div className="selection-info">
              <button 
                className="select-all-btn"
                onClick={selectAllTasks}
              >
                {selectedTasks.size === filteredTasks.length ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
                <span>すべて選択</span>
              </button>
              <span className="selection-count">
                {selectedTasks.size}件選択中
              </span>
            </div>
            <button 
              className="bulk-delete-btn"
              onClick={handleBulkDelete}
              disabled={selectedTasks.size === 0 || isDeleting}
            >
              <Trash2 size={18} />
              <span>{isDeleting ? '削除中...' : '一括削除'}</span>
            </button>
          </div>
        )}

        {/* Search */}
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="タスクを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Filters & Sort */}
      <div className="controls-section">
        <div className="controls-left">
          <button 
            className={`filter-toggle ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            フィルター
            {hasActiveFilters && <span className="filter-count">!</span>}
          </button>

          <div className="sort-controls">
            <span className="sort-label">並び替え:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="dueDate">期限日</option>
              <option value="priority">優先度</option>
              <option value="status">ステータス</option>
              <option value="title">タイトル</option>
              <option value="createdAt">作成日</option>
            </select>
            <button 
              className="sort-order-btn"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? '昇順' : '降順'}
            >
              <ArrowUpDown size={16} />
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="task-count">
          {filteredTasks.length} / {tasks.length} 件
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          {specialFilter && (
            <div className="special-filter-badge">
              <span>{specialFilterLabels[specialFilter]}</span>
              <button onClick={() => setSpecialFilter('')}>
                <X size={14} />
              </button>
            </div>
          )}

          <select
            value={filters.mainCategoryId}
            onChange={(e) => setFilters(prev => ({ ...prev, mainCategoryId: e.target.value }))}
          >
            <option value="">すべてのカテゴリ</option>
            {mainCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
          >
            <option value="">すべての優先度</option>
            <option value="veryHigh">最高</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">すべてのステータス</option>
            <option value="todo">未着手</option>
            <option value="inProgress">進行中</option>
            <option value="done">完了</option>
            <option value="onHold">保留</option>
          </select>

          <select
            value={filters.tagId}
            onChange={(e) => setFilters(prev => ({ ...prev, tagId: e.target.value }))}
          >
            <option value="">すべてのタグ</option>
            {tags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button className="clear-filters" onClick={clearFilters}>
              <X size={14} />
              クリア
            </button>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="tasks-container">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <p>{hasActiveFilters ? '条件に一致するタスクがありません' : 'タスクがありません'}</p>
            {!hasActiveFilters && (
              <button className="add-task-link" onClick={() => setShowModal(true)}>
                <Plus size={16} />
                タスクを追加する
              </button>
            )}
          </div>
        ) : (
          <div className="task-list">
            {filteredTasks.map(task => {
              const startDate = task.startDate || task.dueDate;
              const isFuture = startDate && startDate > todayStr;
              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onCopy={handleCopyTask}
                  isFuture={isFuture}
                  selectionMode={selectionMode}
                  isSelected={selectedTasks.has(task.id)}
                  onToggleSelect={toggleTaskSelection}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={showModal}
        onClose={handleCloseModal}
        task={editingTask}
      />
    </div>
  );
};

export default TaskListPage;
