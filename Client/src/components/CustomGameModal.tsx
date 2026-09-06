import React, { FC } from 'react';
import { TimeControl, NotificationType } from '../types';
import { ComingSoonPanel } from './ComingSoonPanel';

interface CustomGameModalProps {
  onClose: () => void;
  onStart: (config: {
    timeControl: TimeControl;
    opponent: string;
    gameType: string;
    isRated: boolean;
    side: 'white' | 'random' | 'black';
    ratingMin: string;
    ratingMax: string;
  }) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const CustomGameModal: FC<CustomGameModalProps> = ({ onClose }) => {
  return <ComingSoonPanel title="Özel Oyun" onClose={onClose} />;
};
