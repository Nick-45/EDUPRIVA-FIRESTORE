import React from 'react';

const MetricCard = ({ 
  label, 
  value, 
  subtitle, 
  change, 
  changeType, 
  color, 
  icon,
  progress = 0,
  showProgress = false,
  onClick 
}) => {
  // Color mappings
  const getValueColor = () => {
    switch (color) {
      case 'green': return '#10b981';
      case 'orange': return '#ff6b00';
      case 'yellow': return '#f59e0b';
      case 'red': return '#ef4444';
      case 'blue': return '#3b82f6';
      case 'purple': return '#8b5cf6';
      default: return '#1a202c';
    }
  };

  const getProgressColor = () => {
    switch (color) {
      case 'green': return '#10b981';
      case 'orange': return '#ff6b00';
      case 'yellow': return '#f59e0b';
      case 'red': return '#ef4444';
      case 'blue': return '#3b82f6';
      case 'purple': return '#8b5cf6';
      default: return '#ff6b00';
    }
  };

  const getChangeColor = () => {
    if (changeType === 'up') return '#10b981';
    if (changeType === 'down') return '#ef4444';
    return '#718096';
  };

  const getChangeIcon = () => {
    if (changeType === 'up') return '↑';
    if (changeType === 'down') return '↓';
    return '→';
  };

  return (
    <div className="metric-card" onClick={onClick}>
      <div className="metric-header">
        <div className="metric-info">
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ color: getValueColor() }}>
            {value}
          </div>
          {subtitle && <div className="metric-subtitle">{subtitle}</div>}
          {change && (
            <div className="metric-change" style={{ color: getChangeColor() }}>
              <span className="change-icon">{getChangeIcon()}</span>
              {change}
            </div>
          )}
        </div>
        {icon && (
          <div className="metric-icon" style={{ background: `rgba(${getValueColor() === '#ff6b00' ? '255, 107, 0' : '16, 185, 129'}, 0.1)` }}>
            <i className={`fas fa-${icon}`} style={{ color: getValueColor() }}></i>
          </div>
        )}
      </div>
      
      {showProgress && (
        <div className="metric-progress">
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: getProgressColor()
              }}
            />
          </div>
          <div className="progress-label">{Math.round(progress)}%</div>
        </div>
      )}

      <style jsx>{`
        .metric-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 16px;
          transition: all 0.2s ease;
          cursor: ${onClick ? 'pointer' : 'default'};
          position: relative;
          overflow: hidden;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: ${getValueColor()};
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          border-color: rgba(255, 107, 0, 0.2);
        }

        .metric-card:hover::before {
          transform: scaleX(1);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .metric-info {
          flex: 1;
          min-width: 0;
        }

        .metric-label {
          font-size: 11px;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 4px;
          word-break: break-word;
        }

        .metric-subtitle {
          font-size: 11px;
          color: #a0aec0;
          margin-top: 4px;
        }

        .metric-change {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          margin-top: 8px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 20px;
        }

        .change-icon {
          font-size: 10px;
          font-weight: 700;
        }

        .metric-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .metric-card:hover .metric-icon {
          transform: scale(1.05);
        }

        .metric-progress {
          margin-top: 16px;
        }

        .progress-bar-bg {
          height: 4px;
          background: #edf2f7;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        .progress-label {
          font-size: 10px;
          color: #718096;
          margin-top: 6px;
          text-align: right;
        }

        /* Pulse indicator for live data */
        .pulse-indicator {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .metric-card {
            padding: 12px;
          }

          .metric-value {
            font-size: 24px;
          }

          .metric-icon {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .metric-label {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default MetricCard;
