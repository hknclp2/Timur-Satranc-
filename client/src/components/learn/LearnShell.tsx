import React, { FC, ReactNode } from 'react';

interface LearnShellProps {
  children: ReactNode;
}

/**
 * Öğren modülü responsive kabuğu (sadece Learn sayfalarında kullanılır).
 * Mobil (<md): mevcut tek kolon akış aynen korunur.
 * Masaüstü (md+): içerik ortalanmış geniş kapta, satır uzunluğu okunabilir aralıkta.
 * Oyun ve diğer sayfalar 9:16 çerçevede kalır — bu kabuk onlara dokunmaz.
 */
export const LearnShell: FC<LearnShellProps> = ({ children }) => (
  <div className="mx-auto w-full h-full max-w-6xl md:px-6 lg:px-10">
    {children}
  </div>
);
