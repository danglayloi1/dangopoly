import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyAnimSpeed } from './ui/animation';
import './styles.css';
import './folk.css';
import './themes.css';

applyAnimSpeed();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
