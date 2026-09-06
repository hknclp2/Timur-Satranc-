import React, { FC } from 'react';
import { NotificationType } from '../types';
import { ComingSoonPanel } from './ComingSoonPanel';

interface CoachModalProps {
  onClose: () => void;
  onStartCoachGame: (coachName: string, tipLevel: string) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const CoachModal: FC<CoachModalProps> = ({ onClose }) => {
  return <ComingSoonPanel title="Koç ile Oyna" onClose={onClose} />;
};
