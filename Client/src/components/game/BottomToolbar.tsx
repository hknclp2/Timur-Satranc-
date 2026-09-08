import React, { FC } from 'react';
import {
  List,
  Pause,
  Play,
  MagnifyingGlassPlus,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';

export interface BottomToolbarProps {
  onOptions: () => void;
  onTogglePause?: () => void;
  isPaused?: boolean;
  pauseHidden?: boolean;
  onSelfAnalysis: () => void;
  /** true ise analiz butonu gizlenir (örn. oyun sürerken). */
  analysisHidden?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}

function ToolButton({
  onClick,
  disabled,
  label,
  title,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-1 transition-all ${
        disabled
          ? 'text-white/25 cursor-not-allowed'
          : 'text-white/85 hover:text-white active:scale-90 cursor-pointer'
      }`}
    >
      {children}
      <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

/**
 * Koyu temalı alt kontrol çubuğu — ekran görüntüsündeki
 * Options / Pause / Self Analysis / Back / Forward dizilimi.
 */
export const BottomToolbar: FC<BottomToolbarProps> = ({
  onOptions,
  onTogglePause,
  isPaused = false,
  pauseHidden = false,
  onSelfAnalysis,
  analysisHidden = false,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
}) => {
  return (
    <nav
      aria-label="Oyun alt araç çubuğu"
      className="w-full sticky bottom-0 z-20 bg-[#101010]/95 backdrop-blur border-t border-white/10 px-2 py-2 flex items-center justify-around select-none"
    >
      <ToolButton onClick={onOptions} label="Seçenekler">
        <List size={26} weight="bold" />
      </ToolButton>

      {!pauseHidden && (
        <ToolButton
          onClick={onTogglePause}
          label={isPaused ? 'Devam' : 'Duraklat'}
          title={isPaused ? 'Oyuna Devam Et' : 'Oyunu Duraklat'}
        >
          {isPaused ? <Play size={26} weight="fill" /> : <Pause size={26} weight="fill" />}
        </ToolButton>
      )}

      {!analysisHidden && (
        <ToolButton onClick={onSelfAnalysis} label="Kendi Kendine Analiz" title="Kendi Kendine Analiz (serbest tahta)">
          <MagnifyingGlassPlus size={26} weight="bold" />
        </ToolButton>
      )}

      <ToolButton onClick={onPrevious} disabled={!canPrevious} label="Geri" title="Önceki hamle">
        <CaretLeft size={26} weight="bold" />
      </ToolButton>

      <ToolButton onClick={onNext} disabled={!canNext} label="İleri" title="Sonraki hamle">
        <CaretRight size={26} weight="bold" />
      </ToolButton>
    </nav>
  );
};

export default BottomToolbar;
