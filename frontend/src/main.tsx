import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const el = document.getElementById('root');
if (!el) {
  throw new Error('Élément #root introuvable');
}

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
