import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { DialogProvider } from './context/DialogContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HeroUIProvider>
      <AuthProvider>
        <DataProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </DataProvider>
      </AuthProvider>
    </HeroUIProvider>
  </React.StrictMode>
);
