import React from 'react';

const Button = ({ children, onClick, variant = 'primary', disabled = false, loading = false, className = '' }) => {
  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white',
    secondary: 'bg-transparent border border-dark-border text-gray-400 hover:text-white hover:border-gray-600',
    ghost: 'bg-transparent text-gray-400 hover:text-white'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-5 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
