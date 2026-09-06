import React, { FC } from 'react';

interface EngineNoteProps {
  text?: string;
}

/**
 * PDF anlatımı esastır; motor henüz desteklemiyorsa gösterilen küçük rozet.
 * Kapsam: sadece bilgilendirme, motor kodu değişmez.
 */
export const EngineNote: FC<EngineNoteProps> = ({
  text = 'PDF anlatımı esastır; oyun motoruna sonraki fazda eklenecek.',
}) => (
  <div className="mt-2 text-xs leading-relaxed px-3 py-2 rounded-xl border border-amber-600/30 bg-amber-100 text-amber-900">
    ⚙️ Motor notu: {text}
  </div>
);
