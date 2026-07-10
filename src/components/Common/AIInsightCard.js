import React from 'react';

const AIInsightCard = ({ insight, onAction, actionLabel, severity = 'info' }) => {
  if (!insight) return null;

  const severityColors = {
    info: { bg: 'linear-gradient(135deg, #ff6b00 0%, #e55a00 100%)', icon: '💡' },
    warning: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: '⚠️' },
    success: { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', icon: '🎯' },
    danger: { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: '🚨' }
  };

  const currentSeverity = severityColors[severity] || severityColors.info;

  return (
    <div className="ai-insight-card" style={{ background: currentSeverity.bg }}>
      <div className="ai-insight-bg-decoration"></div>
      <div className="ai-insight-content">
        <div className="ai-insight-header">
          <span className="ai-insight-icon">{currentSeverity.icon}</span>
          <span className="ai-insight-badge">AI Advisory</span>
        </div>
        <p className="ai-insight-text">{insight}</p>
        {onAction && actionLabel && (
          <button onClick={onAction} className="ai-insight-action">
            {actionLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>

      <style jsx>{`
        .ai-insight-card {
          position: relative;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          color: white;
          overflow: hidden;
          animation: slideIn 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ai-insight-bg-decoration {
          position: absolute;
          bottom: -20px;
          right: -20px;
          width: 100px;
          height: 100px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          pointer-events: none;
        }

        .ai-insight-bg-decoration::before {
          content: '✨';
          position: absolute;
          bottom: 30px;
          right: 30px;
          font-size: 48px;
          opacity: 0.2;
        }

        .ai-insight-content {
          position: relative;
          z-index: 1;
        }

        .ai-insight-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .ai-insight-icon {
          font-size: 20px;
        }

        .ai-insight-badge {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
          backdrop-filter: blur(4px);
        }

        .ai-insight-text {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        .ai-insight-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }

        .ai-insight-action:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateX(2px);
        }

        /* Loading skeleton */
        .ai-insight-card.skeleton {
          background: linear-gradient(90deg, #e2e8f0 25%, #edf2f7 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .ai-insight-card {
            padding: 16px;
          }

          .ai-insight-text {
            font-size: 13px;
          }

          .ai-insight-action {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

// Multiple insights carousel view
export const AIInsightsCarousel = ({ insights, onAction, autoRotate = true, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (!autoRotate || isPaused || !insights || insights.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [autoRotate, isPaused, insights, interval]);

  if (!insights || insights.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + insights.length) % insights.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), interval);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % insights.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), interval);
  };

  return (
    <div className="insights-carousel">
      <AIInsightCard 
        insight={insights[currentIndex]} 
        onAction={onAction}
        actionLabel="View Details"
      />
      
      {insights.length > 1 && (
        <div className="carousel-controls">
          <button onClick={handlePrev} className="carousel-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="carousel-dots">
            {insights.map((_, idx) => (
              <button
                key={idx}
                className={`carousel-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), interval);
                }}
              />
            ))}
          </div>
          <button onClick={handleNext} className="carousel-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}

      <style jsx>{`
        .insights-carousel {
          position: relative;
        }

        .carousel-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
        }

        .carousel-btn {
          background: rgba(255, 107, 0, 0.1);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
          color: #ff6b00;
          transition: all 0.2s;
        }

        .carousel-btn:hover {
          background: rgba(255, 107, 0, 0.2);
          transform: scale(1.05);
        }

        .carousel-dots {
          display: flex;
          gap: 8px;
        }

        .carousel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #cbd5e0;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }

        .carousel-dot.active {
          width: 20px;
          border-radius: 3px;
          background: #ff6b00;
        }

        .carousel-dot:hover {
          background: #ff6b00;
        }
      `}</style>
    </div>
  );
};

export default AIInsightCard;
