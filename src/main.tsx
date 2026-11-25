import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Suppress benign WebSocket or popup-closed-by-user cancellations in iframe preview environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    const code = reason?.code || '';
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      msg.includes('popup-closed-by-user') ||
      msg.includes('WebSocket') ||
      msg.includes('ws://') ||
      msg.includes('wss://')
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || event.error?.message || String(event.error || '');
      if (
        msg.includes('WebSocket') ||
        msg.includes('popup-closed-by-user') ||
        msg.includes('ws://') ||
        msg.includes('wss://')
      ) {
        event.preventDefault();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
