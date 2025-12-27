import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { X, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import './TaskModal.css';

const TaskModal = ({ isOpen, onClose, task = null, defaultDate = null }) => {
  const {
    mainCategories,
    subCategories,
    tags,
    getSubCategoriesForMain,
    addTask,
    updateTask,
    findOrCreateTag
  } = useData();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mainCategoryId: '',
    subCategoryId: '',
    priority: 'medium',
    status: 'todo',
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: '',
    estimatedDays: '',
    estimatedHours: '',
    tags: [],
    links: []
  });

  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [linkForm, setLinkForm] = useState({ name: '', url: '' });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form with task data if editing
  useEffect(() => {
    if (task) {
      const taskTags = task.tags ? task.tags.split(',').filter(Boolean) : [];
      const taskLinks = task.links ? JSON.parse(task.links) : [];
      setFormData({
        title: task.title || '',
        description: task.description || '',
        mainCategoryId: task.mainCategoryId || '',
        subCategoryId: task.subCategoryId || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        startDate: task.startDate || '',
        startTime: task.startTime || '',
        dueDate: task.dueDate || '',
        dueTime: task.dueTime || '',
        estimatedDays: task.estimatedDays || '',
        estimatedHours: task.estimatedHours || '',
        tags: taskTags,
        links: taskLinks
      });
    } else {
      // Reset form for new task - use defaultDate if provided
      const initialDate = defaultDate || new Date().toISOString().split('T')[0];
      setFormData({
        title: '',
        description: '',
        mainCategoryId: mainCategories[0]?.id || '',
        subCategoryId: '',
        priority: 'medium',
        status: 'todo',
        startDate: initialDate,
        startTime: '',
        dueDate: initialDate,
        dueTime: '',
        estimatedDays: '',
        estimatedHours: '',
        tags: [],
        links: []
      });
    }
  }, [task, mainCategories, isOpen, defaultDate]);

  // Get filtered subcategories
  const filteredSubCategories = formData.mainCategoryId
    ? getSubCategoriesForMain(formData.mainCategoryId)
    : [];

  // Filter tag suggestions
  const tagSuggestions = tags.filter(tag =>
    tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
    !formData.tags.includes(tag.id)
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Reset subcategory when main category changes
      if (name === 'mainCategoryId') {
        newData.subCategoryId = '';
      }
      return newData;
    });
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    // Clear date error when any date/time field is modified
    if (['startDate', 'startTime', 'dueDate', 'dueTime'].includes(name)) {
      setErrors(prev => ({ ...prev, dates: null }));
    }
  };

  const handleAddTag = async (tagName) => {
    if (!tagName.trim()) return;
    
    // Check if tag already exists
    const existingTag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    
    if (existingTag) {
      if (!formData.tags.includes(existingTag.id)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, existingTag.id]
        }));
      }
    } else {
      // Create new tag
      const newTag = await findOrCreateTag(tagName.trim());
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.id]
      }));
    }
    
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tagId) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(id => id !== tagId)
    }));
  };

  const handleAddLink = () => {
    if (!linkForm.url.trim()) return;
    if (formData.links.length >= 5) return;

    setFormData(prev => ({
      ...prev,
      links: [...prev.links, {
        name: linkForm.name.trim() || linkForm.url.trim(),
        url: linkForm.url.trim()
      }]
    }));
    setLinkForm({ name: '', url: '' });
    setShowLinkForm(false);
  };

  const handleRemoveLink = (index) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    }
    // 開始日時と期限日時の整合性チェック（時間も含む）
    if (formData.startDate && formData.dueDate) {
      // 開始時間未入力 → 0:00扱い、期限時間未入力 → 23:59扱い
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}:00`);
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime || '23:59'}:00`);
      
      if (startDateTime > dueDateTime) {
        newErrors.dates = '開始日時は期限日時より前にしてください';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const taskData = {
        ...formData,
        tags: formData.tags.join(','),
        links: JSON.stringify(formData.links)
      };

      if (task?.id) {
        await updateTask(task.id, taskData);
      } else {
        await addTask(taskData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
      setErrors({ submit: 'タスクの保存に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Check if this is a copy (has task data but no id)
  const isEditing = task?.id;
  const isCopying = task && !task.id;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'タスクを編集' : isCopying ? 'タスクをコピー' : 'タスクを追加'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">タイトル *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="タスク名を入力"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">説明</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="詳細説明（任意）"
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="form-group category-section">
            <div className="radio-group">
              {mainCategories.map(cat => (
                <label key={cat.id} className="radio-label">
                  <input
                    type="radio"
                    name="mainCategoryId"
                    value={cat.id}
                    checked={formData.mainCategoryId === cat.id}
                    onChange={handleChange}
                  />
                  <span className="radio-text">
                    {cat.name}
                  </span>
                </label>
              ))}
            </div>
            <select
              id="subCategoryId"
              name="subCategoryId"
              value={formData.subCategoryId}
              onChange={handleChange}
              disabled={!formData.mainCategoryId}
              className="subcategory-select"
            >
              <option value="">小分類を選択</option>
              {filteredSubCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Priority and Status */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">優先度</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="veryHigh">最高</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="status">ステータス</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="todo">未着手</option>
                <option value="inProgress">進行中</option>
                <option value="done">完了</option>
                <option value="onHold">保留</option>
              </select>
            </div>
          </div>

          {/* Start Date and Time */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">開始日</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="startTime">開始時間</label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Due Date and Time */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dueDate">期限日</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="dueTime">期限時間</label>
              <input
                type="time"
                id="dueTime"
                name="dueTime"
                value={formData.dueTime}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Date Validation Error */}
          {errors.dates && (
            <div className="error-message date-error">{errors.dates}</div>
          )}

          {/* Estimated Time */}
          <div className="form-group">
            <label>予測時間</label>
            <div className="estimated-time-row">
              <div className="time-input-group">
                <input
                  type="number"
                  id="estimatedDays"
                  name="estimatedDays"
                  value={formData.estimatedDays}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
                <span className="time-label">日</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  id="estimatedHours"
                  name="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
                <span className="time-label">時間</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label>タグ</label>
            <div className="tags-container">
              {formData.tags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <span
                    key={tagId}
                    className="tag-chip"
                    style={{ backgroundColor: tag.color + '20', borderColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tagId)}
                      className="tag-remove"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ) : null;
              })}
              <div className="tag-input-wrapper">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="タグを追加..."
                  className="tag-input"
                />
                {showTagSuggestions && tagInput && (
                  <div className="tag-suggestions">
                    {tagSuggestions.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleAddTag(tag.name)}
                        className="tag-suggestion"
                      >
                        {tag.name}
                      </button>
                    ))}
                    {!tagSuggestions.find(t => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => handleAddTag(tagInput)}
                        className="tag-suggestion new"
                      >
                        <Plus size={14} /> 「{tagInput}」を追加
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="form-group">
            <label>リンク（最大5件）</label>
            <div className="links-container">
              {formData.links.map((link, index) => (
                <div key={index} className="link-item">
                  <LinkIcon size={16} />
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-name">
                    {link.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(index)}
                    className="link-remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              {formData.links.length < 5 && (
                showLinkForm ? (
                  <div className="link-form">
                    <input
                      type="text"
                      value={linkForm.name}
                      onChange={(e) => setLinkForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="表示名（任意）"
                    />
                    <input
                      type="url"
                      value={linkForm.url}
                      onChange={(e) => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="URL *"
                    />
                    <div className="link-form-actions">
                      <button type="button" onClick={() => setShowLinkForm(false)} className="btn-cancel">
                        キャンセル
                      </button>
                      <button type="button" onClick={handleAddLink} className="btn-add">
                        追加
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLinkForm(true)}
                    className="add-link-btn"
                  >
                    <Plus size={16} /> リンクを追加
                  </button>
                )
              )}
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="submit-error">{errors.submit}</div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              キャンセル
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
