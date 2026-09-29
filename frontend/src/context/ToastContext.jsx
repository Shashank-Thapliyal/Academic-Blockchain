import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { parseBlockchainError } from '../utils/errorHandler';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, technicalDetails, duration }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const toastDuration = duration || (type === 'error' ? 7000 : 5000);

    const newToast = {
      id,
      type,
      title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Notice' : 'Information'),
      message,
      technicalDetails,
      expanded: false
    };

    setToasts((prev) => [...prev, newToast]);

    if (toastDuration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toastDuration);
    }
    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message, title = 'Transaction Confirmed') => {
    return addToast({ type: 'success', title, message });
  }, [addToast]);

  const showError = useCallback((rawError, title = 'Transaction Error') => {
    const cleanMessage = parseBlockchainError(rawError);
    let details = null;
    if (typeof rawError === 'string') {
      details = rawError;
    } else if (rawError?.error) {
      details = typeof rawError.error === 'string' ? rawError.error : JSON.stringify(rawError.error, null, 2);
    } else if (rawError?.message) {
      details = rawError.message;
    }

    // Only attach technical details if they differ from the cleaned message
    // and contain raw runtime/docker/stack information
    const hasRawTechDetails = details && (
      details.includes('docker') || 
      details.includes('Command failed') || 
      details.includes('chaincode response') || 
      details.includes('Error:')
    );

    return addToast({
      type: 'error',
      title,
      message: cleanMessage,
      technicalDetails: hasRawTechDetails ? details : null
    });
  }, [addToast]);

  const showWarning = useCallback((message, title = 'Warning') => {
    return addToast({ type: 'warning', title, message });
  }, [addToast]);

  const showInfo = useCallback((message, title = 'Notice') => {
    return addToast({ type: 'info', title, message });
  }, [addToast]);

  const toggleDetails = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t))
    );
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, showSuccess, showError, showWarning, showInfo, removeToast }}>
      {children}
      <div className="toast-portal-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-notification toast-${toast.type}`}
            role="alert"
          >
            <div className="toast-content-wrapper">
              <div className="toast-icon-col">
                {toast.type === 'success' && <CheckCircle2 className="toast-icon success" size={20} />}
                {toast.type === 'error' && <AlertCircle className="toast-icon error" size={20} />}
                {toast.type === 'warning' && <AlertTriangle className="toast-icon warning" size={20} />}
                {toast.type === 'info' && <Info className="toast-icon info" size={20} />}
              </div>
              <div className="toast-body-col">
                <div className="toast-header-row">
                  <h4 className="toast-title">{toast.title}</h4>
                  <button
                    type="button"
                    className="toast-close-btn"
                    onClick={() => removeToast(toast.id)}
                    aria-label="Dismiss notification"
                  >
                    <X size={15} />
                  </button>
                </div>
                <p className="toast-message">{toast.message}</p>

                {toast.technicalDetails && (
                  <div className="toast-tech-section">
                    <button
                      type="button"
                      className="toast-tech-toggle"
                      onClick={() => toggleDetails(toast.id)}
                    >
                      {toast.expanded ? (
                        <>
                          <ChevronUp size={13} /> Hide technical details
                        </>
                      ) : (
                        <>
                          <ChevronDown size={13} /> Show technical details
                        </>
                      )}
                    </button>
                    {toast.expanded && (
                      <pre className="toast-tech-details">
                        {toast.technicalDetails}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
