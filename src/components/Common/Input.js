import React, { useState } from 'react';

const Input = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder, 
  hint, 
  required = false, 
  className = '',
  error = '',
  disabled = false,
  icon,
  onIconClick,
  autoFocus = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      
      <div className={`input-container ${isFocused ? 'focused' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
        {icon && (
          <div className="input-icon left" onClick={onIconClick}>
            <i className={`fas fa-${icon}`}></i>
          </div>
        )}
        
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="input-field"
        />
        
        {type === 'password' && value && (
          <button
            type="button"
            className="input-icon right clickable"
            onClick={togglePasswordVisibility}
            tabIndex="-1"
          >
            <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
          </button>
        )}
      </div>
      
      {hint && !error && <div className="input-hint">{hint}</div>}
      {error && <div className="input-error">{error}</div>}
      
      <style jsx>{`
        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .input-label {
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

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .input-container.focused {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1);
        }

        .input-container.error {
          border-color: #ef4444;
        }

        .input-container.error.focused {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .input-container.disabled {
          background: #f7fafc;
          opacity: 0.6;
          cursor: not-allowed;
        }

        .input-field {
          flex: 1;
          padding: 10px 14px;
          background: transparent;
          border: none;
          font-size: 14px;
          color: #1a202c;
          outline: none;
          width: 100%;
        }

        .input-field::placeholder {
          color: #a0aec0;
        }

        .input-field:disabled {
          cursor: not-allowed;
        }

        .input-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          color: #a0aec0;
          font-size: 16px;
        }

        .input-icon.left {
          border-right: 1px solid #e2e8f0;
        }

        .input-icon.right {
          border-left: 1px solid #e2e8f0;
        }

        .input-icon.clickable {
          cursor: pointer;
          transition: color 0.2s;
        }

        .input-icon.clickable:hover {
          color: #ff6b00;
        }

        /* Adjust padding when icon is present */
        .input-container:has(.left) .input-field {
          padding-left: 0;
        }

        .input-container:has(.right) .input-field {
          padding-right: 0;
        }

        .input-hint {
          font-size: 12px;
          color: #718096;
          margin-top: 4px;
        }

        .input-error {
          font-size: 12px;
          color: #ef4444;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Textarea variant */
        .input-field[as="textarea"] {
          min-height: 100px;
          resize: vertical;
        }

        /* Focus ring animation */
        @keyframes focusRing {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .input-field {
            font-size: 13px;
            padding: 8px 12px;
          }

          .input-label {
            font-size: 11px;
          }

          .input-icon {
            width: 36px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

// Textarea variant
export const Textarea = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  rows = 4,
  hint, 
  required = false, 
  className = '',
  error = '',
  disabled = false
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`textarea-wrapper ${className}`}>
      {label && (
        <label className="textarea-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      
      <div className={`textarea-container ${isFocused ? 'focused' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="textarea-field"
        />
      </div>
      
      {hint && !error && <div className="textarea-hint">{hint}</div>}
      {error && <div className="textarea-error">{error}</div>}
      
      <style jsx>{`
        .textarea-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .textarea-label {
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

        .textarea-container {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .textarea-container.focused {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1);
        }

        .textarea-container.error {
          border-color: #ef4444;
        }

        .textarea-container.disabled {
          background: #f7fafc;
          opacity: 0.6;
          cursor: not-allowed;
        }

        .textarea-field {
          width: 100%;
          padding: 10px 14px;
          background: transparent;
          border: none;
          font-size: 14px;
          color: #1a202c;
          outline: none;
          font-family: inherit;
          resize: vertical;
        }

        .textarea-field::placeholder {
          color: #a0aec0;
        }

        .textarea-field:disabled {
          cursor: not-allowed;
        }

        .textarea-hint {
          font-size: 12px;
          color: #718096;
          margin-top: 4px;
        }

        .textarea-error {
          font-size: 12px;
          color: #ef4444;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default Input;
