/**
 * useSetupEditor — Serbest Dizilim Modu (Board Setup Editor) Hook
 *
 * Oyun motorundan bağımsız editör state'i:
 * - Başlangıçta klasik dizilimle açılır
 * - Tıkla yerleştir / çift tıkla kaldır / sürükle taşı / sürükle sil
 * - Tıkla-seç + tıkla-taşı (dokunmatik uyumlu) desteklenir
 * - Validasyon core/setup üzerinden yapılır (ileride analiz motoru bağlanacak)
 */

import { useState, useCallback, useMemo } from 'react';
import { BoardMatrix, CitadelState, Piece, PieceType, PlayerColor, BoardPosition } from '../types/chess';
import { createInitialBoardSetup, createPiece } from '../core/engine/boardSetup';
import { validateSetupPosition } from '../core/setup/setupValidator';
import { cloneBoard, cloneCitadels } from '../core/setup/setupSerializer';

export interface SetupEditorState {
  board: BoardMatrix;
  citadels: CitadelState;
  activePalettePiece: { type: PieceType; color: PlayerColor } | null;
  startingTurn: PlayerColor;
}

type AnyPos = BoardPosition;

function samePos(a: AnyPos, b: AnyPos): boolean {
  if (!!a.isCitadel !== !!b.isCitadel) return false;
  if (a.isCitadel) return a.citadelSide === b.citadelSide;
  return a.x === b.x && a.y === b.y;
}

export function useSetupEditor() {
  const initialSetup = createInitialBoardSetup();

  const [board, setBoard] = useState<BoardMatrix>(() =>
    initialSetup.board.map((row) => [...row])
  );
  const [citadels, setCitadels] = useState<CitadelState>(() => ({
    ...initialSetup.citadels,
  }));
  const [activePalettePiece, setActivePalettePiece] = useState<{
    type: PieceType;
    color: PlayerColor;
  } | null>(null);
  const [startingTurn, setStartingTurn] = useState<PlayerColor>('white');
  // Dokunmatik / tıklayarak taşıma için seçili kaynak kare
  const [selectedFrom, setSelectedFrom] = useState<AnyPos | null>(null);

  /** Tahtayı başlangıç dizilimine sıfırla */
  const resetToInitial = useCallback(() => {
    const setup = createInitialBoardSetup();
    setBoard(setup.board.map((row) => [...row]));
    setCitadels({ ...setup.citadels });
    setActivePalettePiece(null);
    setSelectedFrom(null);
  }, []);

  /** Tahtayı tamamen boşalt */
  const clearBoard = useCallback(() => {
    const emptyBoard: BoardMatrix = Array.from({ length: 10 }, () =>
      Array(11).fill(null)
    );
    setBoard(emptyBoard);
    setCitadels({ whiteCitadelPiece: null, blackCitadelPiece: null });
    setActivePalettePiece(null);
    setSelectedFrom(null);
  }, []);

  const getPieceAt = useCallback(
    (pos: AnyPos): Piece | null => {
      if (pos.isCitadel) {
        return pos.citadelSide === 'left' ? citadels.blackCitadelPiece : citadels.whiteCitadelPiece;
      }
      if (pos.y < 0 || pos.y > 9 || pos.x < 0 || pos.x > 10) return null;
      return board[pos.y][pos.x];
    },
    [board, citadels]
  );

  const removePieceAt = useCallback((pos: AnyPos) => {
    if (pos.isCitadel) {
      setCitadels((prev) => {
        if (pos.citadelSide === 'left') return { ...prev, blackCitadelPiece: null };
        return { ...prev, whiteCitadelPiece: null };
      });
      return;
    }
    setBoard((prev) => {
      if (pos.y < 0 || pos.y > 9 || pos.x < 0 || pos.x > 10) return prev;
      if (!prev[pos.y][pos.x]) return prev;
      const newBoard = prev.map((row) => [...row]);
      newBoard[pos.y][pos.x] = null;
      return newBoard;
    });
  }, []);

  /** Kareye tıklama: palet seçiliyse yerleştir, yoksa seç/taşı/kaldır */
  const handleSquareClick = useCallback(
    (pos: AnyPos) => {
      // 1. Palet aktifse: yerleştir (üzerine yaz)
      if (activePalettePiece) {
        const newPiece = createPiece(
          activePalettePiece.type,
          activePalettePiece.color,
          pos.x ?? 0,
          pos.y ?? 0
        );
        (newPiece.position as AnyPos).isCitadel = pos.isCitadel;
        (newPiece.position as AnyPos).citadelSide = pos.citadelSide;
        if (pos.isCitadel) {
          setCitadels((prev) => {
            if (pos.citadelSide === 'left') return { ...prev, blackCitadelPiece: newPiece };
            return { ...prev, whiteCitadelPiece: newPiece };
          });
        } else {
          setBoard((prev) => {
            const newBoard = prev.map((row) => [...row]);
            newBoard[pos.y][pos.x] = newPiece;
            return newBoard;
          });
        }
        return;
      }

      // 2. Kaynak seçiliyse: hedefe taşı (veya aynı kareye tıklanırsa seçimi bırak)
      if (selectedFrom) {
        if (samePos(selectedFrom, pos)) {
          setSelectedFrom(null);
          return;
        }
        const from = selectedFrom;
        setSelectedFrom(null);
        handleDropMove(from, pos);
        return;
      }

      // 3. Kaynak seçili değilse: dolu kareye tıklanırsa onu seç (taşıma için),
      //    boş kareye tıklanırsa bir şey yapma (yanlışlıkla silmeyi önler).
      //    Silme: çift tık veya çöpe sürükleme ile yapılır.
      const existing = getPieceAt(pos);
      if (existing) {
        setSelectedFrom(pos);
      }
    },
    [activePalettePiece, selectedFrom, getPieceAt]
  );

  /** Çift tıklama: her zaman taşı kaldır */
  const handleSquareDoubleClick = useCallback(
    (pos: AnyPos) => {
      setSelectedFrom(null);
      removePieceAt(pos);
    },
    [removePieceAt]
  );

  /** Sürükle-bırak: editör içinde taşı (tahta ↔ tahta ↔ hisar) */
  const handleDropMove = useCallback((from: AnyPos, to: AnyPos) => {
    if (samePos(from, to)) return;
    setSelectedFrom(null);

    // Kaynak parçayı oku
    let movingPiece: Piece | null = null;

    // Hedefe yerleştirme + kaynaktan silme işlemini toplu yap
    if (from.isCitadel) {
      setCitadels((prevCit) => {
        const piece = from.citadelSide === 'left' ? prevCit.blackCitadelPiece : prevCit.whiteCitadelPiece;
        if (!piece) return prevCit;
        movingPiece = piece;

        const cleared = { ...prevCit };
        if (from.citadelSide === 'left') cleared.blackCitadelPiece = null;
        else cleared.whiteCitadelPiece = null;

        if (to.isCitadel) {
          if (to.citadelSide === 'left') cleared.blackCitadelPiece = { ...piece, position: { ...to } };
          else cleared.whiteCitadelPiece = { ...piece, position: { ...to } };
        } else {
          setBoard((prevBoard) => {
            const newBoard = prevBoard.map((row) => [...row]);
            newBoard[to.y][to.x] = { ...piece, position: { x: to.x, y: to.y } };
            return newBoard;
          });
        }
        return cleared;
      });
      return;
    }

    setBoard((prevBoard) => {
      const src = prevBoard[from.y]?.[from.x];
      if (!src) return prevBoard;
      movingPiece = src;
      const newBoard = prevBoard.map((row) => [...row]);
      newBoard[from.y][from.x] = null;

      if (to.isCitadel) {
        setCitadels((prev) => {
          if (to.citadelSide === 'left') return { ...prev, blackCitadelPiece: { ...src, position: { ...to } } };
          return { ...prev, whiteCitadelPiece: { ...src, position: { ...to } } };
        });
      } else {
        newBoard[to.y][to.x] = { ...src, position: { x: to.x, y: to.y } };
      }
      return newBoard;
    });
  }, []);

  /** Sürükle-bırak: paletten tahtaya/hisara taş koy (sınırsız sayıda) */
  const handleDropFromPalette = useCallback(
    (type: PieceType, color: PlayerColor, to: AnyPos) => {
      const newPiece = createPiece(type, color, to.x ?? 0, to.y ?? 0);
      (newPiece.position as AnyPos).isCitadel = to.isCitadel;
      (newPiece.position as AnyPos).citadelSide = to.citadelSide;

      if (to.isCitadel) {
        setCitadels((prev) => {
          if (to.citadelSide === 'left') return { ...prev, blackCitadelPiece: newPiece };
          return { ...prev, whiteCitadelPiece: newPiece };
        });
      } else {
        setBoard((prev) => {
          const newBoard = prev.map((row) => [...row]);
          newBoard[to.y][to.x] = newPiece;
          return newBoard;
        });
      }
    },
    []
  );

  /** Sürükleyerek kaldırma: tahtadaki/hisardaki taşı sil (çöp alanına drop) */
  const handleRemoveDraggedPiece = useCallback(
    (from: AnyPos) => {
      setSelectedFrom(null);
      removePieceAt(from);
    },
    [removePieceAt]
  );

  /** Citadel taşını da sürükle-bırak ile taşı */
  const handleCitadelDrop = useCallback(
    (from: { isCitadel: true; citadelSide: 'left' | 'right' }, to: AnyPos) => {
      handleDropMove(from as AnyPos, to);
    },
    [handleDropMove]
  );

  const validation = useMemo(
    () => validateSetupPosition({ board, citadels, startingTurn }),
    [board, citadels, startingTurn]
  );

  const getSnapshot = useCallback(
    () => ({
      board: cloneBoard(board),
      citadels: cloneCitadels(citadels),
      startingTurn,
    }),
    [board, citadels, startingTurn]
  );

  return {
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
    handleCitadelDrop,
    getSnapshot,
    resetToInitial,
    clearBoard,
  };
}
