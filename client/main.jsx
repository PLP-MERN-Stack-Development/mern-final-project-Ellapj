import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Global styles and Tailwind directives

const rootElement = document.getElementById('root');

if (rootElement) {
  // Use createRoot for React 18+ compatibility
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  console.error("Failed to find the root element with id 'root'. Check index.html.");
}