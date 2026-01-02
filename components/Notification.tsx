'use client';

import React, { useEffect, useRef } from 'react';

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  duration?: number;
  customStyle?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  };
}

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
  onConfirm,
  onCancel,
  position = 'top-center',
  duration,
  customStyle
}) => {
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    let timeoutId: ReturnType<typeof setTimeout>;
    if (duration) {
      timeoutId = setTimeout(onClose, duration);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onClose, duration]);

  const getBackgroundColor = () => {
    if (customStyle && customStyle.backgroundColor) {
      return customStyle.backgroundColor;
    }
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-blue-500';
      case 'confirm': return 'bg-white';
      default: return 'bg-gray-500';
    }
  };

  const getTextColor = () => {
    if (customStyle && customStyle.textColor) {
      return customStyle.textColor;
    }
    return type === 'confirm' ? 'text-black' : 'text-white';
  };

  const getBorderColor = () => {
    if (customStyle && customStyle.borderColor) {
      return `border-2 border-${customStyle.borderColor}`;
    }
    return type === 'confirm' ? 'border-2 border-black' : '';
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
      style={{
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
        borderColor: getBorderColor(),
      }}
      className={`fixed ${getPosition()} ${getBorderColor()} p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ease-in-out max-w-sm w-full sm:w-96`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center">
        <p className="text-center mb-4">{message}</p>
        {type === 'confirm' ? (
          <div className="flex justify-center space-x-4 w-full">
            <button
              onClick={() => { onConfirm?.(); onClose(); }}
              className={`${getTextColor()} hover:opacity-80 focus:outline-none px-4 py-2 bg-transparent border border-current rounded w-24`}
              aria-label="Confirm"
            >
              Yes
            </button>
            <button
              onClick={() => { onCancel?.(); onClose(); }}
              className="text-red-500 hover:opacity-80 focus:outline-none px-4 py-2 bg-transparent border border-current rounded w-24"
              aria-label="Cancel"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className={`${getTextColor()} hover:opacity-80 focus:outline-none mt-2`}
            aria-label="Close notification"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Notification;