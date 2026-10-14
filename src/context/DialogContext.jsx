import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import AppDialog from '../components/common/AppDialog';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: 'Confirmation',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: false,
    isPrompt: false,
    promptPlaceholder: '',
    promptValue: ''
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : (options || {});
      resolverRef.current = (val) => resolve(Boolean(val));

      setDialogConfig({
        isOpen: true,
        title: opts.title || (opts.danger ? 'Confirm Action' : 'Confirmation'),
        message: opts.message || 'Are you sure you want to proceed?',
        confirmText: opts.confirmText || (opts.danger ? 'Delete' : 'Confirm'),
        cancelText: opts.cancelText || 'Cancel',
        isDanger: opts.danger !== false && (opts.danger === true || opts.isDanger === true),
        isPrompt: false,
        promptPlaceholder: '',
        promptValue: ''
      });
    });
  }, []);

  const prompt = useCallback((options) => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : (options || {});
      const initialVal = opts.defaultValue || '';

      resolverRef.current = (confirmed, val) => {
        if (!confirmed) {
          resolve(null);
        } else {
          resolve(val !== undefined ? val : initialVal);
        }
      };

      setDialogConfig({
        isOpen: true,
        title: opts.title || 'Input Required',
        message: opts.message || 'Please enter a value:',
        confirmText: opts.confirmText || 'Save',
        cancelText: opts.cancelText || 'Cancel',
        isDanger: false,
        isPrompt: true,
        promptPlaceholder: opts.placeholder || 'Enter value...',
        promptValue: initialVal
      });
    });
  }, []);

  const handleConfirm = () => {
    const currentVal = dialogConfig.promptValue;
    setDialogConfig(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      if (dialogConfig.isPrompt) {
        resolverRef.current(true, currentVal);
      } else {
        resolverRef.current(true);
      }
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setDialogConfig(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      if (dialogConfig.isPrompt) {
        resolverRef.current(false, null);
      } else {
        resolverRef.current(false);
      }
      resolverRef.current = null;
    }
  };

  // Expose to window.appConfirm and window.appPrompt for 100% legacy parity
  useEffect(() => {
    window.appConfirm = confirm;
    window.appPrompt = prompt;

    return () => {
      delete window.appConfirm;
      delete window.appPrompt;
    };
  }, [confirm, prompt]);

  return (
    <DialogContext.Provider value={{ confirm, prompt, appConfirm: confirm, appPrompt: prompt }}>
      {children}
      <AppDialog
        isOpen={dialogConfig.isOpen}
        onClose={handleCancel}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        isDanger={dialogConfig.isDanger}
        isPrompt={dialogConfig.isPrompt}
        promptPlaceholder={dialogConfig.promptPlaceholder}
        promptValue={dialogConfig.promptValue}
        setPromptValue={(val) => setDialogConfig(prev => ({ ...prev, promptValue: val }))}
        onConfirm={handleConfirm}
      />
    </DialogContext.Provider>
  );
}

export const useDialog = () => useContext(DialogContext);
