import React, { useState } from 'react';

const Select = ({ 
  label, 
  value, 
  onChange, 
  options, 
  required = false, 
  className = '',
  placeholder = 'Select an option',
  error = '',
  hint = '',
  disabled = false,
  icon,
  clearable = false,
  onClear
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = React.useRef(null);

  const handleSelect = (selectedValue) => {
    onChange({ target: { value: selectedValue } });
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`select-wrapper ${className}`}>
      {label && (
        <label className="select-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      
      <div 
        className={`select-container ${isFocused ? 'focused' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        ref={selectRef}
      >
        {icon && (
          <div className="select-icon left">
            <i className={`fas fa-${icon}`}></i>
          </div>
        )}
        
        <div 
          className={`select-trigger ${!value ? 'has-placeholder' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          tabIndex={disabled ? -1 : 0}
        >
          <span className="select-value">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          <div className="select-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
        
        {clearable && value && onClear && (
          <button 
            className="select-clear"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
      
      {isOpen && !disabled && (
        <>
          <div className="select-dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="select-dropdown">
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`select-option ${opt.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {opt.value === value && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      
      {hint && !error && <div className="select-hint">{hint}</div>}
      {error && <div className="select-error">{error}</div>}
      
      <style jsx>{`
        .select-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          position: relative;
        }

        .select-label {
          font-size: 12px;
          font-weight: 600;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .required-star {
          color: #ff6b00;
          margin-left: 4px;
        }

        .select-container {
          position: relative;
          display: flex;
          align-items: center;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .select-container.focused {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1);
        }

        .select-container.error {
          border-color: #ef4444;
        }

        .select-container.error.focused {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .select-container.disabled {
          background: #f7fafc;
          opacity: 0.6;
          cursor: not-allowed;
        }

        .select-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          color: #a0aec0;
          font-size: 16px;
        }

        .select-icon.left {
          border-right: 1px solid #e2e8f0;
        }

        .select-trigger {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          cursor: pointer;
          user-select: none;
        }

        .select-container.disabled .select-trigger {
          cursor: not-allowed;
        }

        .select-value {
          font-size: 14px;
          color: #1a202c;
        }

        .select-trigger.has-placeholder .select-value {
          color: #a0aec0;
        }

        .select-arrow {
          color: #a0aec0;
          transition: transform 0.2s;
          display: flex;
          align-items: center;
        }

        .select-container.focused .select-arrow {
          transform: rotate(180deg);
          color: #ff6b00;
        }

        .select-clear {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          background: none;
          border: none;
          cursor: pointer;
          color: #a0aec0;
          transition: color 0.2s;
        }

        .select-clear:hover {
          color: #ef4444;
        }

        /* Dropdown */
        .select-dropdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 998;
        }

        .select-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          z-index: 999;
          max-height: 250px;
          overflow-y: auto;
          animation: dropdownSlide 0.2s ease;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 14px;
          color: #1a202c;
        }

        .select-option:hover {
          background: #f7fafc;
        }

        .select-option.selected {
          background: rgba(255, 107, 0, 0.08);
          color: #ff6b00;
        }

        /* Scrollbar */
        .select-dropdown::-webkit-scrollbar {
          width: 6px;
        }

        .select-dropdown::-webkit-scrollbar-track {
          background: #edf2f7;
          border-radius: 3px;
        }

        .select-dropdown::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }

        .select-dropdown::-webkit-scrollbar-thumb:hover {
          background: #ff6b00;
        }

        .select-hint {
          font-size: 12px;
          color: #718096;
          margin-top: 4px;
        }

        .select-error {
          font-size: 12px;
          color: #ef4444;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .select-trigger {
            padding: 8px 12px;
          }

          .select-value {
            font-size: 13px;
          }

          .select-label {
            font-size: 11px;
          }

          .select-icon {
            width: 36px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default Select;
