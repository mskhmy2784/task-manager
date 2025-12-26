import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { X } from 'lucide-react';
import './TaskModal.css';
import './RoutineModal.css';

const RoutineModal = ({ isOpen, onClose, routine }) => {
  const { 
    mainCategories, 
    getSubCategoriesForMain,
    addRoutine, 
    updateRoutine 
  } = useData();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mainCategoryId: '',
    subCategoryId: '',
    frequency: 'daily',
    dayOfWeek: '',
    dayOfMonth: '1',
    estimatedMinutes: '',
    isActive: 'TRUE'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Day of week options with values for storage
  const dayOfWeekOptions = [
    { value: 'mon', label: '月' },
    { value: 'tue', label: '火' },
    { value: 'wed', label: '水' },
    { value: 'thu', label: '木' },
    { value: 'fri', label: '金' },
    { value: 'sat', label: '土' },
    { value: 'sun', label: '日' }
  ];

  const weekdayValues = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const weekendValues = ['sat', 'sun'];

  // Reset form when modal opens/closes or routine changes
  useEffect(() => {
    if (isOpen) {
      if (routine?.id) {
        // Editing existing routine
        setFormData({
          title: routine.title || '',
          description: routine.description || '',
          mainCategoryId: routine.mainCategoryId || '',
          subCategoryId: routine.subCategoryId || '',
          frequency: routine.frequency || 'daily',
          dayOfWeek: routine.dayOfWeek || '',
          dayOfMonth: routine.dayOfMonth || '1',
          estimatedMinutes: routine.estimatedMinutes || '',
          isActive: routine.isActive || 'TRUE'
        });
      } else if (routine) {
        // Copying routine (has data but no id)
        setFormData({
          title: routine.title || '',
          description: routine.description || '',
          mainCategoryId: routine.mainCategoryId || '',
          subCategoryId: routine.subCategoryId || '',
          frequency: routine.frequency || 'daily',
          dayOfWeek: routine.dayOfWeek || '',
          dayOfMonth: routine.dayOfMonth || '1',
          estimatedMinutes: routine.estimatedMinutes || '',
          isActive: 'TRUE'
        });
      } else {
        // New routine
        setFormData({
          title: '',
          description: '',
          mainCategoryId: '',
          subCategoryId: '',
          frequency: 'daily',
          dayOfWeek: '',
          dayOfMonth: '1',
          estimatedMinutes: '',
          isActive: 'TRUE'
        });
      }
      setErrors({});
    }
  }, [isOpen, routine]);

  // Get filtered subcategories
  const filteredSubCategories = formData.mainCategoryId
    ? getSubCategoriesForMain(formData.mainCategoryId)
    : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear sub category when main category changes
    if (name === 'mainCategoryId') {
      setFormData(prev => ({ ...prev, subCategoryId: '' }));
    }
  };

  // Handle day of week checkbox change
  const handleDayOfWeekChange = (dayValue) => {
    const currentDays = formData.dayOfWeek ? formData.dayOfWeek.split(',') : [];
    let newDays;
    
    if (currentDays.includes(dayValue)) {
      // Remove day
      newDays = currentDays.filter(d => d !== dayValue);
    } else {
      // Add day
      newDays = [...currentDays, dayValue];
    }
    
    // Sort days in order (mon, tue, wed, thu, fri, sat, sun)
    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    newDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    setFormData(prev => ({ ...prev, dayOfWeek: newDays.join(',') }));
  };

  // Quick select buttons
  const selectWeekdays = () => {
    setFormData(prev => ({ ...prev, dayOfWeek: weekdayValues.join(',') }));
  };

  const selectWeekends = () => {
    setFormData(prev => ({ ...prev, dayOfWeek: weekendValues.join(',') }));
  };

  const selectAllDays = () => {
    setFormData(prev => ({ ...prev, dayOfWeek: [...weekdayValues, ...weekendValues].join(',') }));
  };

  const clearDays = () => {
    setFormData(prev => ({ ...prev, dayOfWeek: '' }));
  };

  // Check if a day is selected
  const isDaySelected = (dayValue) => {
    const currentDays = formData.dayOfWeek ? formData.dayOfWeek.split(',') : [];
    return currentDays.includes(dayValue);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    }
    if (formData.frequency === 'weekly' && !formData.dayOfWeek) {
      newErrors.dayOfWeek = '曜日を1つ以上選択してください';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (routine?.id) {
        await updateRoutine(routine.id, formData);
      } else {
        await addRoutine(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save routine:', error);
      setErrors({ submit: 'ルーティンの保存に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = routine?.id;
  const isCopying = routine && !routine.id;

  const frequencyOptions = [
    { value: 'daily', label: '毎日' },
    { value: 'weekly', label: '週次' },
    { value: 'monthly', label: '月次' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'ルーティンを編集' : isCopying ? 'ルーティンをコピー' : 'ルーティンを追加'}</h2>
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
              className={errors.title ? 'error' : ''}
              placeholder="ルーティン名を入力"
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
              placeholder="詳細な説明（任意）"
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mainCategoryId">メインカテゴリ</label>
              <select
                id="mainCategoryId"
                name="mainCategoryId"
                value={formData.mainCategoryId}
                onChange={handleChange}
              >
                <option value="">選択してください</option>
                {mainCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="subCategoryId">サブカテゴリ</label>
              <select
                id="subCategoryId"
                name="subCategoryId"
                value={formData.subCategoryId}
                onChange={handleChange}
                disabled={!formData.mainCategoryId}
              >
                <option value="">選択してください</option>
                {filteredSubCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency */}
          <div className="form-group">
            <label>頻度</label>
            <div className="frequency-options">
              {frequencyOptions.map(opt => (
                <label key={opt.value} className="frequency-option">
                  <input
                    type="radio"
                    name="frequency"
                    value={opt.value}
                    checked={formData.frequency === opt.value}
                    onChange={handleChange}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Day of Week (for weekly) - Multiple selection */}
          {formData.frequency === 'weekly' && (
            <div className="form-group">
              <label>曜日を選択 *</label>
              <div className="day-of-week-selector">
                {dayOfWeekOptions.map(day => (
                  <label 
                    key={day.value} 
                    className={`day-checkbox ${isDaySelected(day.value) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isDaySelected(day.value)}
                      onChange={() => handleDayOfWeekChange(day.value)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
              <div className="quick-select-buttons">
                <button type="button" className="quick-btn" onClick={selectWeekdays}>平日</button>
                <button type="button" className="quick-btn" onClick={selectWeekends}>週末</button>
                <button type="button" className="quick-btn" onClick={selectAllDays}>全日</button>
                <button type="button" className="quick-btn clear" onClick={clearDays}>クリア</button>
              </div>
              {errors.dayOfWeek && <span className="error-message">{errors.dayOfWeek}</span>}
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {formData.frequency === 'monthly' && (
            <div className="form-group">
              <label htmlFor="dayOfMonth">日</label>
              <select
                id="dayOfMonth"
                name="dayOfMonth"
                value={formData.dayOfMonth}
                onChange={handleChange}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={String(day)}>{day}日</option>
                ))}
                <option value="last">末日</option>
              </select>
              {formData.dayOfMonth === 'last' && (
                <p className="helper-text">※ 月によって28日〜31日が自動的に設定されます</p>
              )}
            </div>
          )}

          {/* Estimated Time */}
          <div className="form-group">
            <label htmlFor="estimatedMinutes">予測時間（分）</label>
            <input
              type="number"
              id="estimatedMinutes"
              name="estimatedMinutes"
              value={formData.estimatedMinutes}
              onChange={handleChange}
              min="0"
              placeholder="例: 30"
            />
          </div>

          {/* Active Status */}
          <div className="form-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={formData.isActive === 'TRUE'}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  isActive: e.target.checked ? 'TRUE' : 'FALSE' 
                }))}
              />
              <span>有効</span>
            </label>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="submit-error">{errors.submit}</div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : isEditing ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoutineModal;
