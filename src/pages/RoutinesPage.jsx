import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Check,
  X as XIcon
} from 'lucide-react';
import RoutineModal from '../components/RoutineModal';
import './RoutinesPage.css';

const RoutinesPage = () => {
  const {
    routines,
    mainCategories,
    isLoading,
    deleteRoutine,
    updateRoutine
  } = useData();

  const [showModal, setShowModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [showMenuId, setShowMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [filter, setFilter] = useState('all'); // all, active, inactive

  // Filter routines
  const filteredRoutines = useMemo(() => {
    return routines.filter(routine => {
      if (filter === 'active') return routine.isActive === 'TRUE';
      if (filter === 'inactive') return routine.isActive !== 'TRUE';
      return true;
    });
  }, [routines, filter]);

  // Group by frequency
  const groupedRoutines = useMemo(() => {
    const groups = {
      daily: { label: '毎日', routines: [] },
      weekly: { label: '週次', routines: [] },
      monthly: { label: '月次', routines: [] }
    };

    filteredRoutines.forEach(routine => {
      const freq = routine.frequency || 'daily';
      if (groups[freq]) {
        groups[freq].routines.push(routine);
      }
    });

    return groups;
  }, [filteredRoutines]);

  const getCategoryName = (categoryId) => {
    const cat = mainCategories.find(c => c.id === categoryId);
    return cat ? cat.name : '';
  };

  const getFrequencyDetail = (routine) => {
    const dayLabels = {
      mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日'
    };

    switch (routine.frequency) {
      case 'weekly':
        if (!routine.dayOfWeek) return '';
        const days = routine.dayOfWeek.split(',');
        // Check for common patterns
        if (days.length === 5 && days.join(',') === 'mon,tue,wed,thu,fri') {
          return '平日';
        }
        if (days.length === 2 && days.join(',') === 'sat,sun') {
          return '週末';
        }
        if (days.length === 7) {
          return '全日';
        }
        // Display individual days
        return days.map(d => dayLabels[d] || d).join('・');
      case 'monthly':
        if (routine.dayOfMonth === 'last') {
          return '末日';
        }
        return routine.dayOfMonth ? `${routine.dayOfMonth}日` : '';
      default:
        return '';
    }
  };

  const handleEdit = (routine) => {
    setEditingRoutine(routine);
    setShowModal(true);
    setShowMenuId(null);
  };

  const handleCopy = (routine) => {
    const copiedRoutine = {
      ...routine,
      id: undefined,
      title: `${routine.title} (コピー)`
    };
    setEditingRoutine(copiedRoutine);
    setShowModal(true);
    setShowMenuId(null);
  };

  const handleDelete = async (routineId) => {
    if (window.confirm('このルーティンを削除しますか？')) {
      try {
        await deleteRoutine(routineId);
      } catch (error) {
        console.error('Failed to delete routine:', error);
      }
    }
    setShowMenuId(null);
  };

  const handleToggleActive = async (routine) => {
    try {
      await updateRoutine(routine.id, {
        isActive: routine.isActive === 'TRUE' ? 'FALSE' : 'TRUE'
      });
    } catch (error) {
      console.error('Failed to toggle routine:', error);
    }
    setShowMenuId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoutine(null);
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
    <div className="routines-page">
      {/* Header */}
      <header className="page-header">
        <h1>ルーティン管理</h1>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          <span>新規ルーティン</span>
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          すべて ({routines.length})
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          有効 ({routines.filter(r => r.isActive === 'TRUE').length})
        </button>
        <button
          className={`filter-tab ${filter === 'inactive' ? 'active' : ''}`}
          onClick={() => setFilter('inactive')}
        >
          無効 ({routines.filter(r => r.isActive !== 'TRUE').length})
        </button>
      </div>

      {/* Routine Groups */}
      <div className="routine-groups">
        {Object.entries(groupedRoutines).map(([key, group]) => (
          group.routines.length > 0 && (
            <section key={key} className="routine-group">
              <h2 className="group-title">{group.label}</h2>
              <div className="routine-list">
                {group.routines.map(routine => (
                  <div 
                    key={routine.id} 
                    className={`routine-item ${routine.isActive !== 'TRUE' ? 'inactive' : ''}`}
                  >
                    <div className="routine-main" onClick={() => handleEdit(routine)}>
                      <div className="routine-info">
                        <span className="routine-title">{routine.title}</span>
                        <div className="routine-meta">
                          {routine.mainCategoryId && (
                            <span className="routine-category">
                              {getCategoryName(routine.mainCategoryId)}
                            </span>
                          )}
                          {getFrequencyDetail(routine) && (
                            <span className="routine-detail">
                              {getFrequencyDetail(routine)}
                            </span>
                          )}
                          {routine.estimatedMinutes && (
                            <span className="routine-time">
                              ⏱️ {routine.estimatedMinutes}分
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`status-badge ${routine.isActive === 'TRUE' ? 'active' : 'inactive'}`}>
                        {routine.isActive === 'TRUE' ? '有効' : '無効'}
                      </span>
                    </div>

                    <div className="routine-actions">
                      <div className="menu-wrapper">
                        <button
                          className="action-btn menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (showMenuId === routine.id) {
                              setShowMenuId(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({
                                top: rect.bottom + 4,
                                left: rect.right - 150
                              });
                              setShowMenuId(routine.id);
                            }
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {showMenuId === routine.id && (
                          <>
                            <div className="menu-backdrop" onClick={() => setShowMenuId(null)} />
                            <div className="dropdown-menu" style={{ top: menuPosition.top, left: menuPosition.left }}>
                              <button onClick={() => handleEdit(routine)}>
                                <Edit size={14} />
                                編集
                              </button>
                              <button onClick={() => handleCopy(routine)}>
                                <Copy size={14} />
                                コピー
                              </button>
                              <button onClick={() => handleToggleActive(routine)}>
                                {routine.isActive === 'TRUE' ? (
                                  <>
                                    <XIcon size={14} />
                                    無効にする
                                  </>
                                ) : (
                                  <>
                                    <Check size={14} />
                                    有効にする
                                  </>
                                )}
                              </button>
                              <button onClick={() => handleDelete(routine.id)} className="delete">
                                <Trash2 size={14} />
                                削除
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        ))}

        {filteredRoutines.length === 0 && (
          <div className="empty-state">
            <p>ルーティンがありません</p>
            <button className="add-link" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              ルーティンを追加する
            </button>
          </div>
        )}
      </div>

      {/* Routine Modal */}
      <RoutineModal
        isOpen={showModal}
        onClose={handleCloseModal}
        routine={editingRoutine}
      />
    </div>
  );
};

export default RoutinesPage;
