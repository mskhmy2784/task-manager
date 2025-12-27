import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { format } from 'date-fns';
import { Plus, Filter, X, ArrowUpDown, Search, CheckSquare, Square, Trash2, ChevronDown } from 'lucide-react';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import './TaskListPage.css';

const TaskListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, mainCategories, tags, updateTask, deleteTask, isLoading } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ mainCategoryId: '', priority: '', status: '', tagId: '' });
  const [specialFilter, setSpecialFilter] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const statusOptions = [{ value: 'todo', label: '未着手' }, { value: 'inProgress', label: '進行中' }, { value: 'done', label: '完了' }, { value: 'onHold', label: '保留' }];

  useEffect(() => { const filterParam = searchParams.get('filter'); if (filterParam) { setSpecialFilter(filterParam); setShowFilters(true); setSearchParams({}); } }, [searchParams, setSearchParams]);
  useEffect(() => { const handleClickOutside = () => { if (showBulkStatusMenu) setShowBulkStatusMenu(false); }; document.addEventListener('click', handleClickOutside); return () => document.removeEventListener('click', handleClickOutside); }, [showBulkStatusMenu]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => task.title && task.title.trim() !== '');
    if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(task => task.title.toLowerCase().includes(query) || (task.description && task.description.toLowerCase().includes(query))); }
    if (filters.mainCategoryId) result = result.filter(task => task.mainCategoryId === filters.mainCategoryId);
    if (filters.priority) result = result.filter(task => task.priority === filters.priority);
    if (filters.status) result = result.filter(task => task.status === filters.status);
    if (filters.tagId) result = result.filter(task => { if (!task.tags) return false; return task.tags.split(',').includes(filters.tagId); });
    if (specialFilter === 'incomplete') result = result.filter(task => task.status !== 'done' && task.status !== 'onHold');
    else if (specialFilter === 'overdue') result = result.filter(task => task.dueDate && task.dueDate < todayStr && task.status !== 'done');
    else if (specialFilter === 'onHold') result = result.filter(task => task.status === 'onHold');
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'dueDate') { if (!a.dueDate && !b.dueDate) cmp = 0; else if (!a.dueDate) cmp = 1; else if (!b.dueDate) cmp = -1; else cmp = a.dueDate.localeCompare(b.dueDate); }
      else if (sortBy === 'priority') { const o = { veryHigh: 0, high: 1, medium: 2, low: 3 }; cmp = (o[a.priority] || 2) - (o[b.priority] || 2); }
      else if (sortBy === 'status') { const o = { todo: 0, inProgress: 1, onHold: 2, done: 3 }; cmp = (o[a.status] || 0) - (o[b.status] || 0); }
      else if (sortBy === 'title') cmp = (a.title || '').localeCompare(b.title || '');
      else if (sortBy === 'createdAt') cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [tasks, searchQuery, filters, specialFilter, sortBy, sortOrder, todayStr]);

  const handleEditTask = (task) => { setEditingTask(task); setShowModal(true); };
  const handleCopyTask = (task) => { setEditingTask({ ...task, id: undefined, title: `${task.title} (コピー)`, status: 'todo', completedAt: '' }); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setEditingTask(null); };
  const clearFilters = () => { setFilters({ mainCategoryId: '', priority: '', status: '', tagId: '' }); setSpecialFilter(''); setSearchQuery(''); };
  const toggleSelectionMode = () => { if (selectionMode) { setSelectionMode(false); setSelectedTasks(new Set()); setShowBulkStatusMenu(false); } else { setSelectionMode(true); setSelectedTasks(new Set()); } };
  const toggleTaskSelection = (taskId) => { setSelectedTasks(prev => { const s = new Set(prev); if (s.has(taskId)) s.delete(taskId); else s.add(taskId); return s; }); };
  const selectAllTasks = () => { if (selectedTasks.size === filteredTasks.length) setSelectedTasks(new Set()); else setSelectedTasks(new Set(filteredTasks.map(t => t.id))); };
  const handleBulkDelete = async () => { if (selectedTasks.size === 0) return; if (!window.confirm(`${selectedTasks.size}件のタスクを削除しますか？`)) return; setIsDeleting(true); try { for (const id of Array.from(selectedTasks)) await deleteTask(id); setSelectedTasks(new Set()); setSelectionMode(false); } catch (e) { console.error(e); alert('削除エラー'); } finally { setIsDeleting(false); } };
  const handleBulkStatusChange = async (newStatus) => { if (selectedTasks.size === 0) return; setShowBulkStatusMenu(false); setIsUpdatingStatus(true); try { for (const id of Array.from(selectedTasks)) await updateTask(id, { status: newStatus }); setSelectedTasks(new Set()); setSelectionMode(false); } catch (e) { console.error(e); alert('更新エラー'); } finally { setIsUpdatingStatus(false); } };
  const hasActiveFilters = filters.mainCategoryId || filters.priority || filters.status || filters.tagId || searchQuery || specialFilter;
  const specialFilterLabels = { incomplete: '未完了タスク', overdue: '期限超過タスク', onHold: '保留中タスク' };

  if (isLoading) return <div className="loading-container"><div className="loading-spinner"></div><p>読み込み中...</p></div>;

  return (
    <div className="task-list-page">
      <header className="page-header">
        <div className="header-top">
          <h1>タスク一覧</h1>
          <div className="header-actions">
            <button className={`selection-mode-btn ${selectionMode ? 'active' : ''}`} onClick={toggleSelectionMode}><CheckSquare size={18} /><span>{selectionMode ? '選択解除' : '選択'}</span></button>
            <button className="add-task-btn" onClick={() => setShowModal(true)}><Plus size={20} /><span>新規タスク</span></button>
          </div>
        </div>
        {selectionMode && (
          <div className="selection-bar">
            <div className="selection-info">
              <button className="select-all-btn" onClick={selectAllTasks}>{selectedTasks.size === filteredTasks.length ? <CheckSquare size={18} /> : <Square size={18} />}<span>すべて選択</span></button>
              <span className="selection-count">{selectedTasks.size}件選択中</span>
            </div>
            <div className="bulk-actions">
              <div className="bulk-status-wrapper">
                <button className="bulk-status-btn" onClick={(e) => { e.stopPropagation(); setShowBulkStatusMenu(!showBulkStatusMenu); }} disabled={selectedTasks.size === 0 || isUpdatingStatus}><span>{isUpdatingStatus ? '更新中...' : 'ステータス変更'}</span><ChevronDown size={16} /></button>
                {showBulkStatusMenu && <div className="bulk-status-menu" onClick={(e) => e.stopPropagation()}>{statusOptions.map(o => <button key={o.value} className={`bulk-status-option ${o.value}`} onClick={() => handleBulkStatusChange(o.value)}>{o.label}</button>)}</div>}
              </div>
              <button className="bulk-delete-btn" onClick={handleBulkDelete} disabled={selectedTasks.size === 0 || isDeleting}><Trash2 size={18} /><span>{isDeleting ? '削除中...' : '一括削除'}</span></button>
            </div>
          </div>
        )}
        <div className="search-row"><div className="search-bar"><Search size={18} /><input type="text" placeholder="タスクを検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />{searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}><X size={16} /></button>}</div></div>
      </header>
      <div className="controls-section">
        <div className="controls-left">
          <button className={`filter-toggle ${hasActiveFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}><Filter size={16} />フィルター{hasActiveFilters && <span className="filter-count">!</span>}</button>
          <div className="sort-controls"><span className="sort-label">並び替え:</span><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="dueDate">期限日</option><option value="priority">優先度</option><option value="status">ステータス</option><option value="title">タイトル</option><option value="createdAt">作成日</option></select><button className="sort-order-btn" onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}><ArrowUpDown size={16} />{sortOrder === 'asc' ? '↑' : '↓'}</button></div>
        </div>
        <div className="task-count">{filteredTasks.length} / {tasks.length} 件</div>
      </div>
      {showFilters && (
        <div className="filters-panel">
          {specialFilter && <div className="special-filter-badge"><span>{specialFilterLabels[specialFilter]}</span><button onClick={() => setSpecialFilter('')}><X size={14} /></button></div>}
          <select value={filters.mainCategoryId} onChange={(e) => setFilters(p => ({ ...p, mainCategoryId: e.target.value }))}><option value="">すべてのカテゴリ</option>{mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={filters.priority} onChange={(e) => setFilters(p => ({ ...p, priority: e.target.value }))}><option value="">すべての優先度</option><option value="veryHigh">最高</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select>
          <select value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}><option value="">すべてのステータス</option><option value="todo">未着手</option><option value="inProgress">進行中</option><option value="done">完了</option><option value="onHold">保留</option></select>
          <select value={filters.tagId} onChange={(e) => setFilters(p => ({ ...p, tagId: e.target.value }))}><option value="">すべてのタグ</option>{tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          {hasActiveFilters && <button className="clear-filters" onClick={clearFilters}><X size={14} />クリア</button>}
        </div>
      )}
      <div className="tasks-container">
        {filteredTasks.length === 0 ? (
          <div className="empty-state"><p>{hasActiveFilters ? '条件に一致するタスクがありません' : 'タスクがありません'}</p>{!hasActiveFilters && <button className="add-task-link" onClick={() => setShowModal(true)}><Plus size={16} />タスクを追加する</button>}</div>
        ) : (
          <div className="task-list">{filteredTasks.map(task => { const startDate = task.startDate || task.dueDate; const isFuture = startDate && startDate > todayStr; return <TaskItem key={task.id} task={task} onEdit={handleEditTask} onCopy={handleCopyTask} isFuture={isFuture} selectionMode={selectionMode} isSelected={selectedTasks.has(task.id)} onToggleSelect={toggleTaskSelection} />; })}</div>
        )}
      </div>
      <TaskModal isOpen={showModal} onClose={handleCloseModal} task={editingTask} />
    </div>
  );
};

export default TaskListPage;
