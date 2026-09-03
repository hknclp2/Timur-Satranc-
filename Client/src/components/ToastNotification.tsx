import React, { FC } from 'react';
import { Notification } from '../types';

interface ToastNotificationProps {
  notifications: Notification[];
}

export const ToastNotification: FC<ToastNotificationProps> = ({ notifications }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`pointer-events-auto p-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-start gap-3 bg-[#0a2218]/95 animate-fade-in-up ${
            notif.type === 'success'
              ? 'border-emerald-500/20 border-l-4 border-l-emerald-500 text-white'
              : notif.type === 'error'
              ? 'border-red-500/20 border-l-4 border-l-red-500 text-white'
              : 'border-[#00e5ff]/20 border-l-4 border-l-[#00e5ff] text-white'
          }`}
        >
          {/* İkon */}
          {notif.type === 'success' ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : notif.type === 'error' ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400 shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#00e5ff] shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
          <p className="text-xs font-medium leading-normal">{notif.message}</p>
        </div>
      ))}
    </div>
  );
};
