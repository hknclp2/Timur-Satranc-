/**
 * SetupEditorView — Serbest Dizilim Modu (Board Setup Editor)
 *
 * Oyun motorundan ayrık dizilim sistemi (core/setup) üzerinde çalışır.
 * - Başlangıçta klasik dizilim
 * - Alt palet: beyaz / siyah taş sıraları + çöp alanı (sürükleyerek kaldırma)
 * - Tıkla yerleştir · Çift tıkla kaldır · Sürükle taşı · Seç-taşı (dokunmatik)
 * - Alt bar: Seçenekler (Sıfırla/Temizle) · Çevir · Tamam (oyunu başlat)
 */

import React, { FC, useCallback, useState } from 'react';
import { BoardPosition, PieceType, PlayerColor, PIECE_METADATA } from '../types/chess';
import { BoardGrid } from '../components/board/BoardGrid';
import { PieceView } from '../components/board/PieceView';
import { useSetupEditor } from '../hooks/useSetupEditor';
import {
  ArrowLeft,
  Play,
  Trash,
  ArrowCounterClockwise,
  ListNumbers,
  ArrowsDownUp,
  Check,
  Eraser,
  Clock,
  ArrowClockwise,
} from '@phosphor-icons/react';

// Moda girmeden önceki ekrandan gelen süre ayarını okunabilir metne çevir
function formatSetupTime(totalSeconds: number, incrementSeconds: number): string {
  if (totalSeconds <= 0) return 'Süresiz';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const base = secs > 0 ? `${mins} dk ${secs} sn` : `${mins} dk`;
  return incrementSeconds > 0 ? `${base} + ${incrementSeconds} sn` : base;
}

// ─── Palette Piece Types ─────────────────────────────────────────────────────
const PALETTE_PIECES: PieceType[] = [
  'pawn',
  'knight',
  'bishop',
  'rook',
  'queen',
  'king',
  'general',
  'giraffe',
  'picket',
  'camel',
  'warMachine',
  'prince',
];

function fakePiece(type: PieceType, color: PlayerColor) {
  return {
    id: `palette-${color}-${type}`,
    type,
    color,
    position: { x: 0, y: 0 },
    hasMoved: false,
  };
}

// ─── Bottom Palette Item ─────────────────────────────────────────────────────
interface PaletteItemProps {
  type: PieceType;
  color: PlayerColor;
  isActive: boolean;
  onSelect: () => void;
}

const PaletteItem: FC<PaletteItemProps> = ({ type, color, isActive, onSelect }) => {
  const piece = fakePiece(type, color);
  const label = PIECE_METADATA[type]?.nameTr?.split(' ')[0] ?? type;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'palettePiece', pieceType: type, color })
    );
    e.dataTransfer.effectAllowed = 'copy';
    // Sürüklenen taş görünsün: hayalet görseli ata
    try {
      const img = (e.currentTarget as HTMLDivElement).querySelector('img');
      if (img) {
        e.dataTransfer.setDragImage(img, img.clientWidth / 2, img.clientHeight / 2);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
      title={label}
      className={`
        relative flex-shrink-0 w-11 h-13 flex flex-col items-center justify-center rounded-xl p-1 cursor-pointer
        transition-all duration-150 select-none
        ${isActive
          ? 'bg-[#00d4c4]/30 ring-2 ring-[#00d4c4] scale-105 shadow-[0_0_12px_rgba(0,212,196,0.5)]'
          : 'bg-white/5 hover:bg-white/15 active:scale-95 border border-transparent'
        }
      `}
      style={{ height: 52 }}
    >
      <div className="w-9 h-9 flex items-center justify-center pointer-events-none">
        <PieceView
          piece={piece}
          disableRotation
          draggable={false}
          size="responsive"
          currentTurn="white"
        />
      </div>
    </div>
  );
};

// ─── SetupEditorView ──────────────────────────────────────────────────────────
interface SetupEditorViewProps {
  onExit: () => void;
  onStartGame: (config: {
    board: import('../types/chess').BoardMatrix;
    citadels: import('../types/chess').CitadelState;
    startingTurn: PlayerColor;
    whiteName: string;
    blackName: string;
    initialTimeSeconds: number;
    incrementSeconds: number;
    boardRotates: boolean;
  }) => void;
  initialWhiteName?: string;
  initialBlackName?: string;
  initialTimeSeconds?: number;
  initialIncrementSeconds?: number;
  initialBoardRotates?: boolean;
}

export const SetupEditorView: FC<SetupEditorViewProps> = ({
  onExit,
  onStartGame,
  initialWhiteName = 'Emir Timur',
  initialBlackName = 'Yıldırım Bayezid',
  initialTimeSeconds = 0,
  initialIncrementSeconds = 0,
  initialBoardRotates = false,
}) => {
  const {
    board,
    citadels,
    activePalettePiece,
    startingTurn,
    selectedFrom,
    validation,
    setActivePalettePiece,
    setStartingTurn,
    handleSquareClick,
    handleSquareDoubleClick,
    handleDropMove,
    handleDropFromPalette,
    handleRemoveDraggedPiece,
    resetToInitial,
    clearBoard,
    getSnapshot,
  } = useSetupEditor();

  const [flipped, setFlipped] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showStartOptions, setShowStartOptions] = useState(false);
  const [whiteName, setWhiteName] = useState(initialWhiteName);
  const [blackName, setBlackName] = useState(initialBlackName);
  const [trashHover, setTrashHover] = useState(false);

  const handlePaletteSelect = useCallback(
    (type: PieceType, color: PlayerColor) => {
      setActivePalettePiece((prev) =>
        prev?.type === type && prev?.color === color ? null : { type, color }
      );
    },
    [setActivePalettePiece]
  );

  const onSquareClick = useCallback(
    (pos: BoardPosition) => handleSquareClick(pos),
    [handleSquareClick]
  );
  const onSquareDoubleClick = useCallback(
    (pos: BoardPosition) => handleSquareDoubleClick(pos),
    [handleSquareDoubleClick]
  );
  const onDropMove = useCallback(
    (from: BoardPosition, to: BoardPosition) => handleDropMove(from, to),
    [handleDropMove]
  );
  const onDropFromPalette = useCallback(
    (type: PieceType, color: PlayerColor, to: BoardPosition) => handleDropFromPalette(type, color, to),
    [handleDropFromPalette]
  );

  // Çöp alanına bırakma: tahtadaki taşı kaldır
  const handleTrashDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setTrashHover(false);
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data?.type === 'piece' && data.from) {
          handleRemoveDraggedPiece(data.from);
        }
        // Paletten çöpe bırakma: işlem yok
      } catch {
        /* ignore */
      }
    },
    [handleRemoveDraggedPiece]
  );

  const handleStartGame = () => {
    if (!validation.valid) return;
    const snap = getSnapshot();
    onStartGame({
      board: snap.board,
      citadels: snap.citadels,
      startingTurn,
      whiteName,
      blackName,
      initialTimeSeconds,
      incrementSeconds: initialIncrementSeconds,
      boardRotates: initialBoardRotates,
    });
    setShowStartOptions(false);
  };

  const renderPaletteRow = (color: PlayerColor) => (
    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1 pr-1">
      {PALETTE_PIECES.map((type) => (
        <PaletteItem
          key={`${color}-${type}`}
          type={type}
          color={color}
          isActive={activePalettePiece?.type === type && activePalettePiece?.color === color}
          onSelect={() => handlePaletteSelect(type, color)}
        />
      ))}
    </div>
  );

  return (
    <div className="mobile-screen flex flex-col bg-[#0f2a1d] text-white relative overflow-hidden select-none">

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2 z-10 relative">
        <button
          onClick={onExit}
          className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all"
          aria-label="Geri"
        >
          <ArrowLeft size={24} weight="bold" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-batangas text-xl font-bold text-[#f4eedd] leading-tight">
            Serbest Dizilim
          </h1>
          <span className="text-[10px] text-[#00d4c4] font-semibold">
            {activePalettePiece
              ? `${PIECE_METADATA[activePalettePiece.type]?.nameTr ?? ''} seçili — kareye dokun`
              : selectedFrom
              ? 'Taş seçili — hedef kareye dokun'
              : 'Taşları istediğin gibi diz'}
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* ─── BOARD + PALET (Mobil: dikey — Desktop: yan yana) ── */}
      <div className="flex-1 min-h-0 min-w-0 w-full flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:max-w-6xl lg:mx-auto lg:px-[var(--gutter)]">
      <div className="flex flex-1 items-center justify-center overflow-visible px-[var(--gutter)] lg:px-0 min-h-0 min-w-0 w-full">
        <BoardGrid
          board={board}
          citadels={citadels}
          selectedPos={selectedFrom}
          validMoves={[]}
          lastMove={null}
          turn="white"
          boardRotates={false}
          flipped={flipped}
          isEditorMode={true}
          onSquareClick={onSquareClick}
          onSquareDoubleClick={onSquareDoubleClick}
          onDropMove={onDropMove}
          onDropFromPalette={onDropFromPalette}
        />
      </div>

      {/* ─── ALT PALET (Mobil: altta 2 sıra — Desktop: sağ panel) ── */}
      <div className="px-2 pb-1 z-10 lg:px-0 lg:pb-0 lg:sticky lg:top-20 lg:self-start min-w-0">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-2 flex gap-2 lg:flex-col">
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            {/* Beyaz sırası */}
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-white border border-black/40 flex-shrink-0 ml-0.5" />
              {renderPaletteRow('white')}
            </div>
            <div className="border-t border-white/10" />
            {/* Siyah sırası */}
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-text-primary border border-black/40 flex-shrink-0 ml-0.5" />
              {renderPaletteRow('black')}
            </div>
          </div>

          {/* Çöp alanı (sürükleyerek kaldırma) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setTrashHover(true);
            }}
            onDragLeave={() => setTrashHover(false)}
            onDrop={handleTrashDrop}
            title="Taşı buraya sürükleyerek kaldır"
            className={`
              w-14 lg:w-auto flex-shrink-0 rounded-xl border-2 border-dashed flex flex-col lg:flex-row items-center justify-center gap-1 lg:px-3 lg:py-2
              transition-all cursor-pointer
              ${trashHover
                ? 'border-red-400 bg-red-500/20 scale-105'
                : 'border-white/20 bg-white/5 hover:bg-white/10'
              }
            `}
          >
            <Trash size={22} weight="bold" className={trashHover ? 'text-red-300' : 'text-white/60'} />
            <span className="text-[8px] font-bold text-white/50 text-center leading-tight">Sürükle<br />sil</span>
          </div>
        </div>
        <div className="text-[10px] text-white/40 text-center leading-tight py-1.5">
          <span className="text-[#00d4c4] font-semibold">Tıkla</span> yerleştir ·{' '}
          <span className="text-[#00d4c4] font-semibold">Çift tıkla / çöpe sürükle</span> kaldır ·{' '}
          <span className="text-[#00d4c4] font-semibold">Sürükle</span> taşı
        </div>
      </div>
      </div>

      {/* ─── ALT AKSIYON BARI (Options · Flip · OK) ──────────────────── */}
      <div className="flex items-stretch justify-around px-6 py-3 border-t border-white/10 z-10 bg-black/20">
        <button
          onClick={() => setShowOptions(true)}
          className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white/70"
        >
          <ListNumbers size={24} weight="bold" />
          <span className="text-[11px] font-semibold">Seçenekler</span>
        </button>
        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white/70"
        >
          <ArrowsDownUp size={24} weight="bold" />
          <span className="text-[11px] font-semibold">Çevir</span>
        </button>
        <button
          onClick={() => setShowStartOptions(true)}
          className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-[#00d4c4]"
        >
          <Check size={24} weight="bold" />
          <span className="text-[11px] font-bold">Tamam</span>
        </button>
      </div>

      {/* ─── SEÇENEKLER MODALI (Sıfırla / Temizle) ───────────────────── */}
      {showOptions && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#1c3829] border border-white/15 rounded-3xl p-4 w-full max-w-sm flex flex-col gap-2 shadow-2xl">
            <h3 className="font-batangas text-lg font-bold text-[#f4eedd] px-2 pt-1">
              Tahta Seçenekleri
            </h3>
            <button
              onClick={() => {
                resetToInitial();
                setShowOptions(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/10 active:scale-[0.99] transition-all text-left"
            >
              <ArrowCounterClockwise size={20} weight="bold" className="text-[#00d4c4]" />
              <span className="font-semibold text-sm">Tahtayı Sıfırla</span>
            </button>
            <button
              onClick={() => {
                clearBoard();
                setShowOptions(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/10 active:scale-[0.99] transition-all text-left"
            >
              <Eraser size={20} weight="bold" className="text-red-300" />
              <span className="font-semibold text-sm">Tahtayı Temizle</span>
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="w-full mt-1 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white/70 font-semibold py-3 rounded-xl transition-all text-sm"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* ─── OYUNU BAŞLAT MODALI ──────────────────────────────────────── */}
      {showStartOptions && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#1c3829] border border-white/15 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl max-h-[90%] overflow-y-auto custom-scrollbar">
            <h3 className="font-batangas text-xl font-bold text-[#f4eedd] text-center">
              Oyunu Başlat
            </h3>

            {!validation.valid && (
              <div className="bg-red-950/50 border border-red-500/40 rounded-xl px-3 py-2.5 text-xs text-red-200 leading-relaxed">
                {validation.errors.map((e) => (
                  <div key={e}>• {e}</div>
                ))}
              </div>
            )}
            {validation.valid && validation.warnings.length > 0 && (
              <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl px-3 py-2.5 text-xs text-amber-200 leading-relaxed">
                {validation.warnings.map((w) => (
                  <div key={w}>• {w}</div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider block mb-1">
                  Beyaz Oyuncu
                </label>
                <input
                  type="text"
                  value={whiteName}
                  onChange={(e) => setWhiteName(e.target.value)}
                  className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-semibold outline-none focus:border-[#00d4c4]/60 transition-all"
                  placeholder="Beyaz oyuncu adı"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider block mb-1">
                  Siyah Oyuncu
                </label>
                <input
                  type="text"
                  value={blackName}
                  onChange={(e) => setBlackName(e.target.value)}
                  className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-semibold outline-none focus:border-[#00d4c4]/60 transition-all"
                  placeholder="Siyah oyuncu adı"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider block mb-1">
                Hamle Sırası
              </label>
              <div className="flex rounded-xl overflow-hidden border border-white/15">
                <button
                  onClick={() => setStartingTurn('white')}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                    startingTurn === 'white'
                      ? 'bg-[#f4eedd] text-[#141f1b]'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  ♔ Beyaz Başlar
                </button>
                <button
                  onClick={() => setStartingTurn('black')}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                    startingTurn === 'black'
                      ? 'bg-[#1a1a1a] text-white border border-white/20'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  ♚ Siyah Başlar
                </button>
              </div>
            </div>

            {/* Moda girmeden önceki ayarlar (Ekranda Oyna ekranından gelir, burada değişmez) */}
            <div className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Clock size={14} weight="bold" className="text-[#00d4c4] flex-shrink-0" />
                <span className="font-semibold">
                  Süre: {formatSetupTime(initialTimeSeconds, initialIncrementSeconds)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <ArrowClockwise size={14} weight="bold" className="text-[#00d4c4] flex-shrink-0" />
                <span className="font-semibold">
                  Tahta döndürme: {initialBoardRotates ? 'Açık' : 'Kapalı'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleStartGame}
                disabled={!validation.valid}
                className={`mobile-main-btn !py-3.5 text-sm gap-2 ${!validation.valid ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Play size={20} weight="fill" />
                <span>Oyunu Başlat</span>
              </button>
              <button
                onClick={() => setShowStartOptions(false)}
                className="w-full bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white/70 font-semibold py-3 rounded-xl transition-all text-sm"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
