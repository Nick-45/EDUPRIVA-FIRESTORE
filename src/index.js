import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

// Error handling for routing
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);

// Add error boundary for the entire app
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#060e08',
          color: '#e4f2e7',
          flexDirection: 'column',
          padding: '20px'
        }}>
          <h1 style={{ color: '#d99200', marginBottom: '20px' }}>Something went wrong</h1>
          <p style={{ marginBottom: '20px', color: '#b2d9b9' }}>Please refresh the page or try again later.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '10px 20px',
              background: '#d99200',
              border: 'none',
              borderRadius: '8px',
              color: '#060e08',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Go to Login
          </button>
          <details style={{ marginTop: '20px', fontSize: '12px', color: '#4d7a56' }}>
            <summary>Error details</summary>
            <pre style={{ marginTop: '10px' }}>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
