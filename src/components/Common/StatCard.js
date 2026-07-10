import React from 'react';

const StatCard = ({ label, value, subtitle, change, changeType, color, icon, onClick }) => {
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

  const getChangeColor = () => {
    if (changeType === 'up') return '#10b981';
    if (changeType === 'down') return '#ef4444';
    return '#718096';
  };

  const getChangeIcon = () => {
    if (changeType === 'up') return '↑';
    if (changeType === 'down') return '↓';
    return '•';
  };

  return (
    <div className="stat-card" onClick={onClick}>
      {icon && (
        <div className="stat-icon">
          <i className={`fas fa-${icon}`}></i>
        </div>
      )}
      
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color: getValueColor() }}>
          {value}
        </div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
        {change && (
          <div className="stat-change" style={{ color: getChangeColor() }}>
            <span className="change-icon">{getChangeIcon()}</span>
            {change}
          </div>
        )}
      </div>

      <style jsx>{`
        .stat-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          transition: all 0.2s ease;
          cursor: ${onClick ? 'pointer' : 'default'};
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
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

        .stat-card:hover::before {
          transform: scaleX(1);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          border-color: rgba(255, 107, 0, 0.2);
        }

        /* With Icon Layout */
        .stat-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 107, 0, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #ff6b00;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .stat-card:hover .stat-icon {
          background: rgba(255, 107, 0, 0.15);
          transform: scale(1.05);
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-label {
          font-size: 11px;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 4px;
          word-break: break-word;
        }

        .stat-subtitle {
          font-size: 12px;
          color: #a0aec0;
          margin-top: 4px;
        }

        .stat-change {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          margin-top: 8px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 20px;
        }

        .change-icon {
          font-size: 12px;
          font-weight: 700;
        }

        /* Without Icon Layout */
        .stat-card:not(:has(.stat-icon)) {
          display: block;
        }

        /* Different Color Variants for hover states */
        .stat-card[data-color="green"]:hover .stat-icon {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .stat-card[data-color="orange"]:hover .stat-icon {
          background: rgba(255, 107, 0, 0.15);
          color: #ff6b00;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .stat-card {
            padding: 16px;
          }

          .stat-icon {
            width: 36px;
            height: 36px;
            font-size: 18px;
          }

          .stat-value {
            font-size: 24px;
          }

          .stat-label {
            font-size: 10px;
          }
        }

        /* Loading Skeleton State */
        .stat-card.skeleton {
          pointer-events: none;
        }

        .stat-card.skeleton .stat-value,
        .stat-card.skeleton .stat-label,
        .stat-card.skeleton .stat-subtitle {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
          color: transparent;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default StatCard;
