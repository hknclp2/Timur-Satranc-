import React, { FC } from 'react';

interface XPBadgeProps {
  xp: number;
}

/** Seviye XP rozeti — yüksek kontrastlı kehribar (PDF §8). */
export const XPBadge: FC<XPBadgeProps> = ({ xp }) => (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-[#00d4c4]/20 text-[#0c4e48] border border-[#00d4c4]/40">
    {xp} XP
  </span>
);
