// Đảm bảo fetch trên window luôn có setter để tương thích với môi trường preview/sandbox
try {
  if (typeof window !== 'undefined') {
    const origFetch = window.fetch;
    let currentFetch = origFetch;
    try {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get: () => currentFetch,
        set: (v) => {
          currentFetch = v;
        },
      });
    } catch {
      // Ignored if already defined or restricted
    }
  }
} catch {
  // Ignored
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
