import React, { FC } from 'react';

/**
 * PDF §7 görselleştirme efsaneleri (oynanabilir tahta yokken metinsel efsane):
 * - Turuncu nokta = üzerinden geçilen ama durulamayan ara kare (Nöbetçi/Zürafa)
 * - Yeşil halka = yasal varış karesi
 * - Mikro-rozet = piyade sağ-alt temsil silueti
 * - Altın buton = Çatal Işınlama Mevcut (ders 5.2)
 * - Altın bordür = hisar cebi
 */
export const MicroBadgeLegend: FC = () => (
  <div className="rounded-2xl p-4 border border-[#e5dcce] bg-[#f5eedc] shadow-md flex flex-col gap-2.5">
    <div className="text-xs font-bold uppercase tracking-widest text-[#5c6c66]">Tahta efsanesi (PDF §7)</div>
    <div className="flex items-center gap-2.5 text-sm text-[#3a4a44]">
      <span className="w-3.5 h-3.5 rounded-full bg-orange-400/60 flex-shrink-0" />
      <span>Turuncu nokta: geçilir ama durulamaz (Nöbetçi / Zürafa ara karesi)</span>
    </div>
    <div className="flex items-center gap-2.5 text-sm text-[#3a4a44]">
      <span className="w-4 h-4 rounded-full border-2 border-emerald-600 flex-shrink-0" />
      <span>Yeşil halka: yasal varış karesi</span>
    </div>
    <div className="flex items-center gap-2.5 text-sm text-[#3a4a44]">
      <span className="w-6 h-6 rounded-md bg-[#141f1b]/5 border border-[#141f1b]/15 text-[11px] text-[#141f1b] flex items-center justify-center font-bold flex-shrink-0">K</span>
      <span>Mikro-rozet: piyadenin sağ-alt temsil silueti (örn. Kale piyadesi)</span>
    </div>
    <div className="flex items-center gap-2.5 text-sm text-[#3a4a44]">
      <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-600/40 text-amber-900 text-xs font-bold flex-shrink-0">⚡ Çatal Işınlama Mevcut</span>
      <span>Ders 5.2 altın buton efsanesi (oyunda aktif olacak)</span>
    </div>
    <div className="flex items-center gap-2.5 text-sm text-[#3a4a44]">
      <span className="w-6 h-6 rounded-sm border-2 border-amber-600 bg-amber-100 flex items-center justify-center text-xs flex-shrink-0">🏰</span>
      <span>Altın bordür: hisar cebi (H-SOL / H-SAĞ)</span>
    </div>
  </div>
);
