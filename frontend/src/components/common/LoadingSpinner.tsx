import React from 'react';

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="w-10 h-10 border-4 border-indigo-200 border-t-primary rounded-full animate-spin" />
    <p className="text-sm text-gray-400">{text}</p>
  </div>
);

export default LoadingSpinner;
