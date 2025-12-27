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
    isLoading,
    deleteTask,
    updateTask
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
  const [specialFilter, setSpecialFilter] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // 選択モード
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Handle URL parameters
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setSpecialFilter(filterParam);
      setShowFilters(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => task.title && task.title.trim() !== '');

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
      );
    }

    if (filters.mainCategoryId) {
      result = result.filter(task => task.mainCategoryId === filters.mainCategoryId);
    }

    if (filters.priority) {
      result = result.filter(task => task.priority === filters.priority);
    }

    if (filters.status) {
      result = result.filter(task => task.status === filters.status);
    }

    if (filters.tagId) {
      result = result.filter(task => {
        if (!task.tags) return false;
        const taskTags = task.tags.split(',');
        return taskTags.includes(filters.tagId);
      });
    }

    if (specialFilter === 'incomplete') {
      result = result.filter(task => task.status !== 'done' && task.status !== 'onHold');
    } else if (specialFilter === 'overdue') {
      // 期限超過: 期限日時を過ぎている AND 未完了（時間を考慮）
      const now = new Date();
      result = result.filter(task => {
        if (!task.dueDate || task.status === 'done') return false;
        
        let dueDateTime;
        if (task.dueTime) {
          dueDateTime = new Date(`${task.dueDate}T${task.dueTime}:00`);
        } else {
          dueDateTime = new Date(`${task.dueDate}T23:59:59`);
        }
        
        return now > dueDateTime;
      });
    } else if (specialFilter === 'onHold') {
      result = result.filter(task => task.status === 'onHold');
    }

    const priorityOrder = { veryHigh: 0, high: 1, medium: 2, low: 3 };
    const statusOrder = { todo: 0, inProgress: 1, onHold: 2, done: 3 };

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'dueDate':
          const dateA = a.dueDate || '9999-99-99';
          const dateB = b.dueDate || '9999-99-99';
          comparison = dateA.localeCompare(dateB);
          break;
        case 'priority':
          comparison = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
          break;
        case 'status':
          comparison = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'createdAt':
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchQuery, filters, specialFilter, sortBy, sortOrder, todayStr]);

  const clearFilters = () => {
    setFilters({ mainCategoryId: '', priority: '', status: '', tagId: '' });
    setSpecialFilter('');
  };

  const hasActiveFilters = filters.mainCategoryId || filters.priority || filters.status || filters.tagId || searchQuery || specialFilter;

  const specialFilterLabels = {
    incomplete: '未完了タスク',
    overdue: '期限超過タスク',
    onHold: '保留中タスク'
  };

  // 選択モードの切り替え
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedTasks([]);
    setShowBulkActions(false);
  };

  // タスクの選択/解除
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(task => task.id));
    }
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!window.confirm(`${selectedTasks.length}件のタスクを削除しますか？`)) return;
    
    setBulkUpdating(true);
    try {
      for (const taskId of selectedTasks) {
        await deleteTask(taskId);
      }
      setSelectedTasks([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to delete tasks:', error);
    } finally {
      setBulkUpdating(false);
    }
  };

  // 一括ステータス更新
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedTasks.length === 0) return;
    
    setBulkUpdating(true);
    try {
      for (const taskId of selectedTasks) {
        await updateTask(taskId, { status: newStatus });
      }
      setSelectedTasks([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to update tasks:', error);
    } finally {
      setBulkUpdating(false);
    }
  };

  // タスク編集
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  // タスクコピー
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

  // モーダルを閉じる
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
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
        {/* 1行目: タイトルのみ */}
        <h1>タスク一覧</h1>

        {/* 2行目: ボタンと検索バー */}
        <div className="header-controls">
          <div className="header-buttons">
            <button 
              className={`select-btn ${selectMode ? 'active' : ''}`}
              onClick={toggleSelectMode}
            >
              <CheckSquare size={18} />
              <span>選択</span>
            </button>
            <button className="add-task-btn" onClick={() => setShowModal(true)}>
              <Plus size={20} />
              <span>新規タスク</span>
            </button>
          </div>
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
        </div>
      </header>

      {/* 選択モード時の一括操作バー */}
      {selectMode && (
        <div className="bulk-actions-bar">
          <div className="bulk-actions-left">
            <button 
              className="select-all-btn"
              onClick={toggleSelectAll}
            >
              {selectedTasks.length === filteredTasks.length ? '全解除' : '全選択'}
            </button>
            <span className="selected-count">{selectedTasks.length}件選択中</span>
          </div>
          {selectedTasks.length > 0 && (
            <div className="bulk-actions-right">
              <div className="bulk-status-dropdown">
                <button 
                  className="bulk-status-btn"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  disabled={bulkUpdating}
                >
                  ステータス変更
                </button>
                {showBulkActions && (
                  <>
                    <div className="bulk-backdrop" onClick={() => setShowBulkActions(false)} />
                    <div className="bulk-dropdown-menu">
                      <button onClick={() => handleBulkStatusUpdate('todo')}>未着手</button>
                      <button onClick={() => handleBulkStatusUpdate('inProgress')}>進行中</button>
                      <button onClick={() => handleBulkStatusUpdate('done')}>完了</button>
                      <button onClick={() => handleBulkStatusUpdate('onHold')}>保留</button>
                    </div>
                  </>
                )}
              </div>
              <button 
                className="bulk-delete-btn"
                onClick={handleBulkDelete}
                disabled={bulkUpdating}
              >
                <Trash2 size={16} />
                削除
              </button>
            </div>
          )}
        </div>
      )}

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
                <div key={task.id} className={`task-item-wrapper ${selectMode ? 'select-mode' : ''}`}>
                  {selectMode && (
                    <button
                      className={`task-select-checkbox ${selectedTasks.includes(task.id) ? 'checked' : ''}`}
                      onClick={() => toggleTaskSelection(task.id)}
                    >
                      {selectedTasks.includes(task.id) && <span>✓</span>}
                    </button>
                  )}
                  <TaskItem
                    task={task}
                    onEdit={handleEditTask}
                    onCopy={handleCopyTask}
                    isFuture={isFuture}
                  />
                </div>
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
