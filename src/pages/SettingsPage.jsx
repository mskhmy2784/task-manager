import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import './SettingsPage.css';

const SettingsPage = () => {
  const {
    mainCategories,
    subCategories,
    tags,
    addMainCategory,
    updateMainCategory,
    deleteMainCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addTag,
    updateTag,
    deleteTag,
    isLoading
  } = useData();

  const [activeTab, setActiveTab] = useState('categories');
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editColor, setEditColor] = useState('#4A90D9');
  
  // New item states
  const [newMainCategory, setNewMainCategory] = useState({ name: '', color: '#4A90D9' });
  const [newSubCategory, setNewSubCategory] = useState({ mainCategoryId: '', name: '' });
  const [newTag, setNewTag] = useState({ name: '', color: '#9E9E9E' });
  const [showNewMainForm, setShowNewMainForm] = useState(false);
  const [showNewSubForm, setShowNewSubForm] = useState(null); // mainCategoryId
  const [showNewTagForm, setShowNewTagForm] = useState(false);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Main Category handlers
  const handleAddMainCategory = async () => {
    if (!newMainCategory.name.trim()) return;
    try {
      await addMainCategory(newMainCategory);
      setNewMainCategory({ name: '', color: '#4A90D9' });
      setShowNewMainForm(false);
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleUpdateMainCategory = async (id) => {
    if (!editValue.trim()) return;
    try {
      await updateMainCategory(id, { name: editValue, color: editColor });
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteMainCategory = async (id) => {
    const hasSubCategories = subCategories.some(sub => sub.mainCategoryId === id);
    if (hasSubCategories) {
      alert('サブカテゴリが存在するため削除できません。先にサブカテゴリを削除してください。');
      return;
    }
    if (window.confirm('このカテゴリを削除しますか？')) {
      try {
        await deleteMainCategory(id);
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  // Sub Category handlers
  const handleAddSubCategory = async (mainCategoryId) => {
    if (!newSubCategory.name.trim()) return;
    try {
      await addSubCategory({ ...newSubCategory, mainCategoryId });
      setNewSubCategory({ mainCategoryId: '', name: '' });
      setShowNewSubForm(null);
    } catch (error) {
      console.error('Failed to add sub category:', error);
    }
  };

  const handleUpdateSubCategory = async (id) => {
    if (!editValue.trim()) return;
    try {
      await updateSubCategory(id, { name: editValue });
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update sub category:', error);
    }
  };

  const handleDeleteSubCategory = async (id) => {
    if (window.confirm('このサブカテゴリを削除しますか？')) {
      try {
        await deleteSubCategory(id);
      } catch (error) {
        console.error('Failed to delete sub category:', error);
      }
    }
  };

  // Tag handlers
  const handleAddTag = async () => {
    if (!newTag.name.trim()) return;
    try {
      await addTag(newTag);
      setNewTag({ name: '', color: '#9E9E9E' });
      setShowNewTagForm(false);
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleUpdateTag = async (id) => {
    if (!editValue.trim()) return;
    try {
      await updateTag(id, { name: editValue, color: editColor });
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (id) => {
    if (window.confirm('このタグを削除しますか？関連するタスク・ルーティンからも削除されます。')) {
      try {
        await deleteTag(id);
      } catch (error) {
        console.error('Failed to delete tag:', error);
      }
    }
  };

  const startEdit = (type, item) => {
    setEditingItem({ type, id: item.id });
    setEditValue(item.name);
    setEditColor(item.color || '#4A90D9');
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
    setEditColor('#4A90D9');
  };

  const colorOptions = [
    '#4A90D9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>設定</h1>
      </header>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          カテゴリ管理
        </button>
        <button
          className={`settings-tab ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          タグ管理
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="settings-section">
          <div className="section-header">
            <h2>カテゴリ</h2>
            <button 
              className="add-btn-small"
              onClick={() => setShowNewMainForm(true)}
            >
              <Plus size={16} />
              追加
            </button>
          </div>

          {/* New Main Category Form */}
          {showNewMainForm && (
            <div className="inline-form">
              <input
                type="text"
                value={newMainCategory.name}
                onChange={(e) => setNewMainCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="カテゴリ名"
                autoFocus
              />
              <div className="color-picker-inline">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    className={`color-dot ${newMainCategory.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewMainCategory(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
              <div className="inline-actions">
                <button className="btn-confirm" onClick={handleAddMainCategory}>
                  <Check size={16} />
                </button>
                <button className="btn-cancel-small" onClick={() => setShowNewMainForm(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="category-list">
            {mainCategories.map(category => {
              const categorySubCategories = subCategories.filter(sub => sub.mainCategoryId === category.id);
              const isExpanded = expandedCategories[category.id];
              const isEditing = editingItem?.type === 'mainCategory' && editingItem?.id === category.id;

              return (
                <div key={category.id} className="category-item">
                  <div className="category-main">
                    <button 
                      className="expand-btn"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    
                    <span 
                      className="category-color" 
                      style={{ backgroundColor: category.color || '#4A90D9' }}
                    />
                    
                    {isEditing ? (
                      <div className="edit-inline">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                        />
                        <div className="color-picker-inline">
                          {colorOptions.map(color => (
                            <button
                              key={color}
                              className={`color-dot ${editColor === color ? 'selected' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditColor(color)}
                            />
                          ))}
                        </div>
                        <button className="btn-confirm" onClick={() => handleUpdateMainCategory(category.id)}>
                          <Check size={16} />
                        </button>
                        <button className="btn-cancel-small" onClick={cancelEdit}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="category-name">{category.name}</span>
                        <span className="sub-count">({categorySubCategories.length})</span>
                        <div className="item-actions">
                          <button onClick={() => startEdit('mainCategory', category)}>
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteMainCategory(category.id)} className="delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sub Categories */}
                  {isExpanded && (
                    <div className="sub-category-list">
                      {categorySubCategories.map(sub => {
                        const isSubEditing = editingItem?.type === 'subCategory' && editingItem?.id === sub.id;
                        return (
                          <div key={sub.id} className="sub-category-item">
                            {isSubEditing ? (
                              <div className="edit-inline">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  autoFocus
                                />
                                <button className="btn-confirm" onClick={() => handleUpdateSubCategory(sub.id)}>
                                  <Check size={16} />
                                </button>
                                <button className="btn-cancel-small" onClick={cancelEdit}>
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="sub-category-name">{sub.name}</span>
                                <div className="item-actions">
                                  <button onClick={() => startEdit('subCategory', sub)}>
                                    <Edit size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteSubCategory(sub.id)} className="delete">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* New Sub Category Form */}
                      {showNewSubForm === category.id ? (
                        <div className="inline-form sub">
                          <input
                            type="text"
                            value={newSubCategory.name}
                            onChange={(e) => setNewSubCategory(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="サブカテゴリ名"
                            autoFocus
                          />
                          <div className="inline-actions">
                            <button className="btn-confirm" onClick={() => handleAddSubCategory(category.id)}>
                              <Check size={16} />
                            </button>
                            <button className="btn-cancel-small" onClick={() => setShowNewSubForm(null)}>
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          className="add-sub-btn"
                          onClick={() => setShowNewSubForm(category.id)}
                        >
                          <Plus size={14} />
                          サブカテゴリを追加
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {mainCategories.length === 0 && !showNewMainForm && (
              <p className="empty-message">カテゴリがありません</p>
            )}
          </div>
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div className="settings-section">
          <div className="section-header">
            <h2>タグ</h2>
            <button 
              className="add-btn-small"
              onClick={() => setShowNewTagForm(true)}
            >
              <Plus size={16} />
              追加
            </button>
          </div>

          {/* New Tag Form */}
          {showNewTagForm && (
            <div className="inline-form">
              <input
                type="text"
                value={newTag.name}
                onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                placeholder="タグ名"
                autoFocus
              />
              <div className="color-picker-inline">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    className={`color-dot ${newTag.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTag(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
              <div className="inline-actions">
                <button className="btn-confirm" onClick={handleAddTag}>
                  <Check size={16} />
                </button>
                <button className="btn-cancel-small" onClick={() => setShowNewTagForm(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Tag List */}
          <div className="tag-list">
            {tags.map(tag => {
              const isEditing = editingItem?.type === 'tag' && editingItem?.id === tag.id;
              return (
                <div key={tag.id} className="tag-item">
                  {isEditing ? (
                    <div className="edit-inline">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="color-picker-inline">
                        {colorOptions.map(color => (
                          <button
                            key={color}
                            className={`color-dot ${editColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditColor(color)}
                          />
                        ))}
                      </div>
                      <button className="btn-confirm" onClick={() => handleUpdateTag(tag.id)}>
                        <Check size={16} />
                      </button>
                      <button className="btn-cancel-small" onClick={cancelEdit}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span 
                        className="tag-badge"
                        style={{ 
                          backgroundColor: (tag.color || '#9E9E9E') + '20',
                          color: tag.color || '#9E9E9E'
                        }}
                      >
                        {tag.name}
                      </span>
                      <div className="item-actions">
                        <button onClick={() => startEdit('tag', tag)}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeleteTag(tag.id)} className="delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {tags.length === 0 && !showNewTagForm && (
              <p className="empty-message">タグがありません</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
