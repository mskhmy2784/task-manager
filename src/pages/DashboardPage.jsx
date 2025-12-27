import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Plus, Copy, ChevronDown } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { 
    tasks, 
    routines, 
    routineLogs, 
    mainCategories,
    isLoading, 
    error,
    updateTask,
    addRoutineLog,
    updateRoutineLog
  } = useData();
  
  const [updatingItems, setUpdatingItems] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showStatusMenu, setShowStatusMenu] = useState(null);

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

  const handleStatusChange = async (taskId, newStatus) => {
    if (updatingItems[taskId]) return;
    setShowStatusMenu(null);
    setUpdatingItems(prev => ({ ...prev, [taskId]: true }));
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // 未完了タスク: status が done, onHold 以外、かつ開始日が今日以前
  const incompleteTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'done' || t.status === 'onHold') return false;
      
      // 開始日が今日より先のものは除外
      const startDate = t.startDate || t.dueDate;
      if (startDate && startDate > todayStr) return false;
      
      return true;
    });
  }, [tasks, todayStr]);

  // 期限切れタスク: 期限日時を過ぎている AND status が done 以外（onHold も含む）
  // v1.0.8修正: 時間も考慮して判定
  const overdueTasks = useMemo(() => {
    const now = new Date();
    
    return tasks.filter(t => {
      if (!t.title || t.title.trim() === '') return false;
      if (!t.dueDate) return false;
      if (t.status === 'done') return false;
      
      // 期限日時を構築
      let dueDateTime;
      if (t.dueTime) {
        // 時間が設定されている場合: その時刻を期限とする
        dueDateTime = new Date(`${t.dueDate}T${t.dueTime}:00`);
      } else {
        // 時間が設定されていない場合: 当日の23:59:59を期限とする
        dueDateTime = new Date(`${t.dueDate}T23:59:59`);
      }
      
      return now > dueDateTime;
    });
  }, [tasks]);

  // 保留タスク: status が onHold
  const onHoldTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'onHold' && t.title && t.title.trim() !== '');
  }, [tasks]);

  // 今日のタスク: 開始日 ≤ 今日 AND 期限日 ≥ 今日 AND 未完了（期限切れは除外）
  const todaysTasks = useMemo(() => {
    return incompleteTasks.filter(t => {
      // 期限切れは除外
      if (t.dueDate && t.dueDate < todayStr) return false;
      
      // 開始日が設定されている場合: 開始日 ≤ 今日
      const startDate = t.startDate || t.dueDate;
      if (startDate && startDate > todayStr) return false;
      
      // 期限日が設定されている場合: 期限日 ≥ 今日
      if (t.dueDate && t.dueDate < todayStr) return false;
      
      return true;
    });
  }, [incompleteTasks, todayStr]);

  // 今日のルーティン
  const todaysRoutines = useMemo(() => {
    const dayMap = {
      '日曜日': 'sun', '月曜日': 'mon', '火曜日': 'tue', 
      '水曜日': 'wed', '木曜日': 'thu', '金曜日': 'fri', '土曜日': 'sat'
    };
    const dayOfWeekJa = format(today, 'EEEE', { locale: ja });
    const currentDayCode = dayMap[dayOfWeekJa];
    const dayOfMonth = today.getDate();
    
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    return routines.filter(routine => {
      if (!routine.isActive || routine.isActive === 'FALSE') return false;
      
      switch (routine.frequency) {
        case 'daily':
          return true;
        case 'weekly':
          if (!routine.dayOfWeek) return false;
          const selectedDays = routine.dayOfWeek.split(',');
          return selectedDays.includes(currentDayCode);
        case 'monthly':
          if (routine.dayOfMonth === 'last') {
            return dayOfMonth === lastDayOfMonth;
          }
          return parseInt(routine.dayOfMonth) === dayOfMonth;
        default:
          return false;
      }
    });
  }, [routines, today]);

  // 今日のルーティンログ
  const todaysRoutineLogs = useMemo(() => {
    return routineLogs.filter(log => log.date === todayStr);
  }, [routineLogs, todayStr]);

  // タスク完了切替
  const handleTaskToggle = async (e, taskId) => {
    e.stopPropagation();
    if (updatingItems[taskId]) return;
    
    setUpdatingItems(prev => ({ ...prev, [taskId]: true }));
    try {
      const task = tasks.find(t => t.id === taskId);
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // タスク編集
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  // ルーティン完了切替
  const handleRoutineToggle = async (routine) => {
    const routineKey = `routine-${routine.id}`;
    if (updatingItems[routineKey]) return;

    setUpdatingItems(prev => ({ ...prev, [routineKey]: true }));
    try {
      const existingLog = todaysRoutineLogs.find(l => l.routineId === routine.id);
      
      if (existingLog) {
        const newStatus = existingLog.status === 'done' ? 'skipped' : 'done';
        await updateRoutineLog(existingLog.id, { status: newStatus });
      } else {
        await addRoutineLog({
          routineId: routine.id,
          date: todayStr,
          status: 'done'
        });
      }
    } catch (error) {
      console.error('Failed to update routine:', error);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [routineKey]: false }));
    }
  };

  // カテゴリ名を取得
  const getCategoryName = (categoryId) => {
    const cat = mainCategories.find(c => c.id === categoryId);
    return cat ? cat.name : '';
  };

  // 期限日をフォーマット
  const formatDueDate = (dueDate, dueTime) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const dateStr = format(date, 'M/d(E)', { locale: ja });
    const timeStr = dueTime || '終日';
    return `${dateStr} ${timeStr}`;
  };

  // タスクをコピー
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

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>エラーが発生しました: {error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>ダッシュボード</h1>
        </div>
        <button className="add-task-btn" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          <span>新規タスク</span>
        </button>
      </header>

      {/* Date and Time Display */}
      <div className="datetime-display">
        <div className="current-date">
          {format(currentTime, 'yyyy年M月d日(E)', { locale: ja })}
        </div>
        <div className="current-time">
          {format(currentTime, 'HH:mm:ss')}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div 
          className="summary-card clickable"
          onClick={() => navigate('/tasks?filter=incomplete')}
        >
          <div className="summary-number">{incompleteTasks.length}</div>
          <div className="summary-label">未完了タスク</div>
        </div>
        <div 
          className={`summary-card clickable ${overdueTasks.length > 0 ? 'warning' : ''}`}
          onClick={() => navigate('/tasks?filter=overdue')}
        >
          <div className="summary-number">{overdueTasks.length}</div>
          <div className="summary-label">期限超過</div>
        </div>
        <div 
          className={`summary-card clickable ${onHoldTasks.length > 0 ? 'hold' : ''}`}
          onClick={() => navigate('/tasks?filter=onHold')}
        >
          <div className="summary-number">{onHoldTasks.length}</div>
          <div className="summary-label">保留中</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Today's Tasks */}
        <section className="dashboard-section">
          <h2 className="section-title">今日のタスク</h2>
          <div className="task-list">
            {todaysTasks.length === 0 ? (
              <p className="empty-message">今日のタスクはありません</p>
            ) : (
              todaysTasks.map(task => (
                <div 
                  key={task.id} 
                  className="task-item"
                >
                  <span 
                    className={`task-checkbox ${task.status === 'done' ? 'checked' : ''} ${updatingItems[task.id] ? 'updating' : ''}`}
                    onClick={(e) => handleTaskToggle(e, task.id)}
                  >
                    {task.status === 'done' ? '✓' : ''}
                  </span>
                  <div 
                    className="task-content"
                    onClick={() => handleEditTask(task)}
                  >
                    <span className="task-title">{task.title}</span>
                    <div className="task-meta">
                      {task.mainCategoryId && (
                        <span className="task-category">{getCategoryName(task.mainCategoryId)}</span>
                      )}
                      {task.dueDate && (
                        <span className="task-due">
                          期限: {formatDueDate(task.dueDate, task.dueTime)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    <button 
                      className="copy-btn"
                      onClick={(e) => { e.stopPropagation(); handleCopyTask(task); }}
                      title="コピー"
                    >
                      <Copy size={16} />
                    </button>
                    <span className={`priority-badge ${task.priority}`}>
                      {task.priority === 'veryHigh' ? '最高' : 
                       task.priority === 'high' ? '高' : 
                       task.priority === 'medium' ? '中' : '低'}
                    </span>
                    <div className="status-dropdown-wrapper">
                      <button
                        className={`status-badge ${task.status}`}
                        onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === task.id ? null : task.id); }}
                        disabled={updatingItems[task.id]}
                      >
                        {statusLabels[task.status] || '未着手'}
                        <ChevronDown size={12} />
                      </button>
                      {showStatusMenu === task.id && (
                        <>
                          <div className="status-backdrop" onClick={() => setShowStatusMenu(null)} />
                          <div className="status-dropdown">
                            {statusOptions.map(option => (
                              <button
                                key={option.value}
                                className={`status-option ${option.value} ${task.status === option.value ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, option.value); }}
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
              ))
            )}
          </div>
        </section>

        {/* Today's Routines */}
        <section className="dashboard-section">
          <h2 className="section-title">今日のルーティン</h2>
          <div className="task-list">
            {todaysRoutines.length === 0 ? (
              <p className="empty-message">今日のルーティンはありません</p>
            ) : (
              todaysRoutines.map(routine => {
                const log = todaysRoutineLogs.find(l => l.routineId === routine.id);
                const isDone = log?.status === 'done';
                const routineKey = `routine-${routine.id}`;
                return (
                  <div 
                    key={routine.id} 
                    className={`task-item ${isDone ? 'done' : ''}`}
                  >
                    <span 
                      className={`task-checkbox ${isDone ? 'checked' : ''} ${updatingItems[routineKey] ? 'updating' : ''}`}
                      onClick={() => handleRoutineToggle(routine)}
                    >
                      {isDone ? '✓' : ''}
                    </span>
                    <div className="task-content">
                      <span className="task-title">{routine.title}</span>
                      <div className="task-meta">
                        {routine.mainCategoryId && (
                          <span className="task-category">{getCategoryName(routine.mainCategoryId)}</span>
                        )}
                        {routine.estimatedMinutes && (
                          <span className="task-due">{routine.estimatedMinutes}分</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <section className="dashboard-section warning-section">
            <h2 className="section-title warning">⚠️ 期限超過タスク</h2>
            <div className="task-list">
              {overdueTasks.map(task => (
                <div 
                  key={task.id} 
                  className="task-item overdue"
                >
                  <span 
                    className={`task-checkbox ${task.status === 'done' ? 'checked' : ''} ${updatingItems[task.id] ? 'updating' : ''}`}
                    onClick={(e) => handleTaskToggle(e, task.id)}
                  >
                    {task.status === 'done' ? '✓' : ''}
                  </span>
                  <div 
                    className="task-content"
                    onClick={() => handleEditTask(task)}
                  >
                    <span className="task-title">{task.title}</span>
                    <div className="task-meta">
                      {task.mainCategoryId && (
                        <span className="task-category">{getCategoryName(task.mainCategoryId)}</span>
                      )}
                      {task.dueDate && (
                        <span className="task-due overdue">
                          期限: {formatDueDate(task.dueDate, task.dueTime)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    <span className={`priority-badge ${task.priority}`}>
                      {task.priority === 'veryHigh' ? '最高' : 
                       task.priority === 'high' ? '高' : 
                       task.priority === 'medium' ? '中' : '低'}
                    </span>
                    <div className="status-dropdown-wrapper">
                      <button
                        className={`status-badge ${task.status}`}
                        onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === `overdue-${task.id}` ? null : `overdue-${task.id}`); }}
                        disabled={updatingItems[task.id]}
                      >
                        {statusLabels[task.status] || '未着手'}
                        <ChevronDown size={12} />
                      </button>
                      {showStatusMenu === `overdue-${task.id}` && (
                        <>
                          <div className="status-backdrop" onClick={() => setShowStatusMenu(null)} />
                          <div className="status-dropdown">
                            {statusOptions.map(option => (
                              <button
                                key={option.value}
                                className={`status-option ${option.value} ${task.status === option.value ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, option.value); }}
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
              ))}
            </div>
          </section>
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

export default DashboardPage;
