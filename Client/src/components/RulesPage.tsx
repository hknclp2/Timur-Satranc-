import React, { FC, useState } from 'react';
import { ArrowLeft, Swords, BookOpen } from 'lucide-react';
import { PageState } from '../types';

// Taş görselleri
import sSah from '../assets/pieces/s_sah.png';
import sVezir from '../assets/pieces/s_vezir.png';
import sKale from '../assets/pieces/s_kale.png';
import sFil from '../assets/pieces/s_fil.png';
import sAt from '../assets/pieces/s_at.png';
import sDeve from '../assets/pieces/s_deve.png';
import sZurafa from '../assets/pieces/s_zurafa.png';
import sMancinik from '../assets/pieces/s_mancinik.png';
import sPiyon from '../assets/pieces/s_piyon.png';

interface RulesPageProps {
  onNavigate: (page: PageState) => void;
  rulesTab: 'pieces' | 'rules';
  setRulesTab: (tab: 'pieces' | 'rules') => void;
  selectedPiece: PieceData | null;
  setSelectedPiece: (p: PieceData | null) => void;
}

interface PieceData {
  name: string;
  symbol: string;
  img: string;
  move: string;
  value: string;
  color: string;
}

const piecesData: PieceData[] = [
  { name: 'Şah',     symbol: 'Ş', img: sSah,      move: "Her yönde 1 kare. Asla tehdit altına giremez.",                        value: '∞', color: '#f59e0b' },
  { name: 'Vezir',   symbol: 'V', img: sVezir,    move: 'Her yönde istediği kadar kare hareket eder.',                           value: '9', color: '#a78bfa' },
  { name: 'Kale',    symbol: 'K', img: sKale,     move: 'Yatay ve dikey istediği kadar kare.',                                   value: '5', color: '#60a5fa' },
  { name: 'Fil',     symbol: 'F', img: sFil,      move: 'Çapraz istediği kadar kare hareket eder.',                              value: '3', color: '#34d399' },
  { name: 'At',      symbol: 'A', img: sAt,       move: "L şeklinde: 2+1 kare. Taşları atlayabilir.",                           value: '3', color: '#00d4c4' },
  { name: 'Deve',    symbol: 'D', img: sDeve,     move: 'Çapraz 2 kare atlayarak hareket eder.',                                value: '4', color: '#fb923c' },
  { name: 'Zürafa',  symbol: 'Z', img: sZurafa,   move: '1 kare düz + 3 kare çapraz veya tersi.',                               value: '5', color: '#facc15' },
  { name: 'Mancınık',symbol: 'M', img: sMancinik, move: '2 kare düz + 2 kare çapraz (L²) hareket eder.',                       value: '4', color: '#f87171' },
  { name: 'Piyade',  symbol: 'P', img: sPiyon,    move: '1 kare ileri. İlk hamlede 2 kare. Çapraz yer.',                       value: '1', color: '#d1d5db' },
];

const rules = [
  { title: 'Oyunun Amacı',  icon: '🎯', desc: "Rakibin Şahını mat ederek oyunu kazanmak. Mat, Şahın kaçma yolu kalmadığı ve tehdit altında olduğu durumdur." },
  { title: 'Tahta Boyutu',  icon: '📐', desc: "Timur Satrancı 10×11 büyüklüğünde bir tahta üzerinde oynanır. Bu standart satrancın 8×8 tahtasından çok daha geniştir." },
  { title: 'Sıra Takibi',   icon: '⏱️', desc: "Beyaz her zaman ilk hamleyi yapar. Oyuncular sırayla birer hamle yapar. Sıranızı geçemezsiniz." },
  { title: 'Taş Yeme',      icon: '⚔️', desc: "Bir taş, rakibin taşının üzerine hareket ederek onu tahtadan kaldırabilir. Kendi taşınızın üzerine gidemezsiniz." },
  { title: 'Şah ve Mat',    icon: '👑', desc: "Şahınız tehdit altındaysa 'şah' durumundasınızdır ve tehdidi mutlaka gidermeniz gerekir. Bunu yapamazsanız mat olursunuz." },
  { title: 'Beraberlik',    icon: '🤝', desc: "Oyun; pat durumunda, yetersiz materyal olduğunda veya her iki oyuncu anlaştığında beraberlikle sonuçlanabilir." },
];

export const RulesPage: FC<RulesPageProps> = ({ onNavigate, rulesTab, setRulesTab, selectedPiece, setSelectedPiece }) => {
  return (
    <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
      {/* Arka plan */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 55%)' }}
      />

      {/* Başlık */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-3 relative z-10 flex-shrink-0">
        <button onClick={() => onNavigate('LEARN_MENU')} className="mobile-back-btn" aria-label="Geri">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </div>
        </button>
        <div>
          <h1 className="font-batangas text-[2rem] font-bold text-white tracking-wide leading-none">Kurallar</h1>
          <p className="text-white/40 text-xs mt-0.5">Taşlar ve oyun kuralları</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="px-5 pb-3 flex-shrink-0 relative z-10">
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/[0.08]">
          {[
            { key: 'pieces' as const, label: 'Taşlar',  icon: <Swords size={14} /> },
            { key: 'rules'  as const, label: 'Kurallar', icon: <BookOpen size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRulesTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
              style={{
                background:   rulesTab === tab.key ? 'rgba(245,158,11,0.2)'   : 'transparent',
                color:        rulesTab === tab.key ? '#f59e0b'                 : 'rgba(255,255,255,0.3)',
                border:       rulesTab === tab.key ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-8 relative z-10">
        {rulesTab === 'pieces' ? (
          <>
            {/* Taş ızgarası */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {piecesData.map((piece) => (
                <button
                  key={piece.name}
                  onClick={() => setSelectedPiece(selectedPiece?.name === piece.name ? null : piece)}
                  className="rounded-2xl p-3 flex flex-col items-center gap-2 border transition-all active:scale-95"
                  style={{
                    background:   selectedPiece?.name === piece.name ? `${piece.color}18` : 'rgba(255,255,255,0.04)',
                    borderColor:  selectedPiece?.name === piece.name ? `${piece.color}50` : 'rgba(255,255,255,0.07)',
                    boxShadow:    selectedPiece?.name === piece.name ? `0 4px 16px ${piece.color}25` : 'none',
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${piece.color}15` }}>
                    <img src={piece.img} alt={piece.name} className="w-8 h-8 object-contain" />
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: selectedPiece?.name === piece.name ? piece.color : 'rgba(255,255,255,0.6)' }}>
                    {piece.name}
                  </span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${piece.color}20`, color: piece.color }}>
                    {piece.value === '∞' ? '♾' : `+${piece.value}`}
                  </span>
                </button>
              ))}
            </div>

            {/* Seçili taş detayı */}
            {selectedPiece && (
              <div
                className="rounded-2xl p-5 border mb-4 animate-slide-down"
                style={{ background: `${selectedPiece.color}10`, borderColor: `${selectedPiece.color}30` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `${selectedPiece.color}20`, border: `1.5px solid ${selectedPiece.color}40` }}
                  >
                    <img src={selectedPiece.img} alt={selectedPiece.name} className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <div className="font-batangas text-xl font-bold" style={{ color: selectedPiece.color }}>{selectedPiece.name}</div>
                    <div className="text-white/40 text-xs">Hamle değeri: {selectedPiece.value}</div>
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{selectedPiece.move}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {rules.map((rule, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 border flex gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  {rule.icon}
                </div>
                <div className="flex-1">
                  <div className="font-batangas text-base font-bold text-white mb-1">{rule.title}</div>
                  <p className="text-white/45 text-xs leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export type { PieceData };
