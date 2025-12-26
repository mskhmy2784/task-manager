import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import {
  Check,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Link as LinkIcon,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import './TaskItem.css';

const TaskItem = ({ task, onEdit, onCopy, isFuture = false }) => {
  const { updateTask, deleteTask, getMainCategory, getSubCategory, tags } = useData();
  const [showMenu, setShowMenu] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const mainCategory = getMainCategory(task.mainCategoryId);
  const subCategory = getSubCategory(task.subCategoryId);
  const taskTags = task.tags ? task.tags.split(',').filter(Boolean).map(id => tags.find(t => t.id === id)).filter(Boolean) : [];
  const taskLinks = task.links ? JSON.parse(task.links) : [];

  const priorityLabels = {
    veryHigh: '最高',
    high: '高',
    medium: '中',
    low: '低'
  };

  const statusLabels = {
    todo: '未着手',
    inProgress: '進行中',
    done: '完了',
    onHold: '保留'
  };

  const statusOptions = [
    { value: 'todo', label: '未着手' },
    { value: 'inProgress', label: '進行中' },
    { value: 'done', label: '完了' },
    { value: 'onHold', label: '保留' }
  ];

  const handleToggleComplete = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (isUpdating || newStatus === task.status) {
      setShowStatusMenu(false);
      return;
    }
    setIsUpdating(true);
    setShowStatusMenu(false);
    try {
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('このタスクを削除しますか？')) {
      try {
        await deleteTask(task.id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
    setShowMenu(false);
  };

  const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'done';

  return (
    <div className={`task-item-card ${task.status} ${isOverdue ? 'overdue' : ''} ${isFuture ? 'future' : ''}`}>
      <div className="task-main">
        <button
          className={`checkbox ${task.status === 'done' ? 'checked' : ''}`}
          onClick={handleToggleComplete}
          disabled={isUpdating}
        >
          {task.status === 'done' && <Check size={14} />}
        </button>

        <div className="task-content" onClick={() => onEdit(task)}>
          <div className="task-title-row">
            <span className="task-title">{task.title}</span>
            <div className="task-badges">
              <span className={`priority-badge ${task.priority}`}>
                {priorityLabels[task.priority]}
              </span>
              <div className="status-dropdown-wrapper" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`status-badge ${task.status}`}
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={isUpdating}
                >
                  {statusLabels[task.status] || '未着手'}
                  <ChevronDown size={12} />
                </button>
                {showStatusMenu && (
                  <>
                    <div className="status-backdrop" onClick={() => setShowStatusMenu(false)} />
                    <div className="status-dropdown">
                      {statusOptions.map(option => (
                        <button
                          key={option.value}
                          className={`status-option ${option.value} ${task.status === option.value ? 'active' : ''}`}
                          onClick={() => handleStatusChange(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="task-meta">
            {mainCategory && (
              <span className="category-label" style={{ color: mainCategory.color }}>
                {mainCategory.name}
                {subCategory && ` > ${subCategory.name}`}
              </span>
            )}
            {task.startDate && (
              <span className="start-date">
                開始: {task.startDate}{task.startTime ? ` ${task.startTime}` : ''}
              </span>
            )}
            {task.dueDate && (
              <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
                期限: {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ''}
              </span>
            )}
            {(task.estimatedDays || task.estimatedHours) && (
              <span className="estimated-time">
                ⏱️ {task.estimatedDays ? `${task.estimatedDays}日` : ''}{task.estimatedDays && task.estimatedHours ? ' ' : ''}{task.estimatedHours ? `${task.estimatedHours}時間` : ''}
              </span>
            )}
          </div>

          {taskTags.length > 0 && (
            <div className="task-tags">
              {taskTags.map(tag => (
                <span
                  key={tag.id}
                  className="tag-badge"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="task-actions">
          {taskLinks.length > 0 && (
            <button
              className="action-btn link-btn"
              onClick={() => setShowLinks(!showLinks)}
              title="リンク"
            >
              <LinkIcon size={16} />
              <span className="link-count">{taskLinks.length}</span>
            </button>
          )}

          <div className="menu-wrapper">
            <button
              className="action-btn menu-btn"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <>
                <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
                <div className="dropdown-menu">
                  <button onClick={() => { onEdit(task); setShowMenu(false); }}>
                    <Edit size={14} />
                    編集
                  </button>
                  {onCopy && (
                    <button onClick={() => { onCopy(task); setShowMenu(false); }}>
                      <Copy size={14} />
                      コピー
                    </button>
                  )}
                  <button onClick={handleDelete} className="delete">
                    <Trash2 size={14} />
                    削除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showLinks && taskLinks.length > 0 && (
        <div className="task-links">
          {taskLinks.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-item"
            >
              <ExternalLink size={14} />
              {link.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
