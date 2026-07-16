import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './styles/index.css';
import './shared/components/StatePanel/StatePanel.css';
import './shared/ui/Button.css';
import './shared/ui/Input.css';
import './shared/ui/Modal.css';
import './shared/ui/Spinner.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
