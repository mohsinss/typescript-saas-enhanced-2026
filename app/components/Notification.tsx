import React, { useEffect, useRef } from 'react';

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const Notification: React.FC<NotificationProps> = ({ 
  type, 
  message, 
  onClose, 
  onConfirm, 
  onCancel,
  position = 'top-center'
}) => {
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-blue-500';
      case 'confirm': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getPosition = () => {
    switch (position) {
      case 'top-right': return 'top-4 right-4';
      case 'top-left': return 'top-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'top-center': return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center': return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default: return 'top-4 left-1/2 transform -translate-x-1/2';
    }
  };

  return (
    <div
      ref={notificationRef}
      className={`fixed ${getPosition()} ${getBackgroundColor()} text-white p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ease-in-out max-w-sm`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <p className="mr-4">{message}</p>
        <div>
          {type === 'confirm' ? (
            <>
              <button
                onClick={() => { onConfirm?.(); onClose(); }}
                className="text-white hover:text-gray-200 focus:outline-none mr-2 px-2 py-1 bg-green-600 rounded"
                aria-label="Confirm"
              >
                Yes
              </button>
              <button
                onClick={() => { onCancel?.(); onClose(); }}
                className="text-white hover:text-gray-200 focus:outline-none px-2 py-1 bg-red-600 rounded"
                aria-label="Cancel"
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 focus:outline-none"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notification;