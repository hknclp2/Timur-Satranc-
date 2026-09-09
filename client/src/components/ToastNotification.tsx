import React, { FC } from 'react';
import { CheckCircle, XCircle, Info } from '@phosphor-icons/react';
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
            <CheckCircle size={20} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
          ) : notif.type === 'error' ? (
            <XCircle size={20} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Info size={20} weight="fill" className="text-[#00e5ff] shrink-0 mt-0.5" />
          )}
          <p className="text-xs font-medium leading-normal">{notif.message}</p>
        </div>
      ))}
    </div>
  );
};
