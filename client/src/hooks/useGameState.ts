import { useState, useEffect, useCallback, useRef } from 'react';

export type PlayerTurn = 'white' | 'black';

export interface GameState {
  turn: PlayerTurn;
  statusText: string;
  whiteTime: number; // saniye cinsinden
  blackTime: number; // saniye cinsinden
  isPaused: boolean;
  historyIndex: number;
  totalHistoryLength: number;
  whiteName: string;
  blackName: string;
  isGameOver: boolean;
  winner: PlayerTurn | 'draw' | null;
  boardRotates: boolean;
}

export interface UseGameStateOptions {
  initialTimeSeconds?: number;
  whiteName?: string;
  blackName?: string;
  boardRotates?: boolean;
  onMoveMade?: (moveNumber: number, turn: PlayerTurn) => void;
  onGameOver?: (winner: PlayerTurn | 'draw', reason: string) => void;
}

export function useGameState(options: UseGameStateOptions = {}) {
  const initialTime = options.initialTimeSeconds ?? 600; // Varsayılan 10 dakika (600 sn)
  const defaultWhiteName = options.whiteName || 'Emir Timur';
  const defaultBlackName = options.blackName || 'Yıldırım Bayezid';

  const [gameState, setGameState] = useState<GameState>({
    turn: 'white',
    statusText: 'Beyazın sırası (Hamle bekleniyor...)',
    whiteTime: initialTime,
    blackTime: initialTime,
    isPaused: false,
    historyIndex: 0,
    totalHistoryLength: 0,
    whiteName: defaultWhiteName,
    blackName: defaultBlackName,
    isGameOver: false,
    winner: null,
    boardRotates: options.boardRotates ?? false,
  });

  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // ─── Zamanlayıcı (Timer) Mantığı ──────────────────────────────────────────
  useEffect(() => {
    if (gameState.isPaused || gameState.isGameOver) return;

    // Süresiz oyun kontrolü (initialTime <= 0 veya çok büyükse)
    if (initialTime <= 0) return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.isPaused || prev.isGameOver) return prev;

        if (prev.turn === 'white') {
          const nextTime = Math.max(0, prev.whiteTime - 1);
          if (nextTime === 0) {
            options.onGameOver?.('black', 'Beyazın süresi bitti!');
            return {
              ...prev,
              whiteTime: 0,
              isGameOver: true,
              winner: 'black',
              statusText: 'Zaman bitti! Siyah kazandı.',
            };
          }
          return { ...prev, whiteTime: nextTime };
        } else {
          const nextTime = Math.max(0, prev.blackTime - 1);
          if (nextTime === 0) {
            options.onGameOver?.('white', 'Siyahın süresi bitti!');
            return {
              ...prev,
              blackTime: 0,
              isGameOver: true,
              winner: 'white',
              statusText: 'Zaman bitti! Beyaz kazandı.',
            };
          }
          return { ...prev, blackTime: nextTime };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.isPaused, gameState.isGameOver, gameState.turn, initialTime, options]);

  // ─── Simülasyon Fonksiyonları ─────────────────────────────────────────────

  // Hamle Yapma (Sırayı diğer oyuncuya geçirir)
  const makeSimulatedMove = useCallback(() => {
    setGameState((prev) => {
      if (prev.isGameOver) return prev;

      const nextTurn: PlayerTurn = prev.turn === 'white' ? 'black' : 'white';
      const nextPlayerName = nextTurn === 'white' ? prev.whiteName : prev.blackName;
      const nextHistoryIdx = prev.historyIndex + 1;

      options.onMoveMade?.(nextHistoryIdx, nextTurn);

      return {
        ...prev,
        turn: nextTurn,
        statusText: `${nextPlayerName} hamle sırası (Hamle #${nextHistoryIdx})`,
        historyIndex: nextHistoryIdx,
        totalHistoryLength: Math.max(prev.totalHistoryLength, nextHistoryIdx),
      };
    });
  }, [options]);

  // Hamle Geri Alma (Undo)
  const handleUndo = useCallback(() => {
    setGameState((prev) => {
      if (prev.historyIndex <= 0) return prev;

      const prevHistoryIdx = prev.historyIndex - 1;
      const prevTurn: PlayerTurn = prev.turn === 'white' ? 'black' : 'white';
      const prevPlayerName = prevTurn === 'white' ? prev.whiteName : prev.blackName;

      return {
        ...prev,
        turn: prevTurn,
        historyIndex: prevHistoryIdx,
        statusText: `Hamle geri alındı (${prevPlayerName} sırası - Hamle #${prevHistoryIdx})`,
      };
    });
  }, []);

  // Hamle İleri Alma (Redo)
  const handleRedo = useCallback(() => {
    setGameState((prev) => {
      if (prev.historyIndex >= prev.totalHistoryLength) return prev;

      const nextHistoryIdx = prev.historyIndex + 1;
      const nextTurn: PlayerTurn = prev.turn === 'white' ? 'black' : 'white';
      const nextPlayerName = nextTurn === 'white' ? prev.whiteName : prev.blackName;

      return {
        ...prev,
        turn: nextTurn,
        historyIndex: nextHistoryIdx,
        statusText: `Hamle ileri alındı (${nextPlayerName} sırası - Hamle #${nextHistoryIdx})`,
      };
    });
  }, []);

  // Duraklatma / Devam Ettirme
  const togglePause = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isPaused: !prev.isPaused,
      statusText: !prev.isPaused ? 'Oyun duraklatıldı.' : `${prev.turn === 'white' ? prev.whiteName : prev.blackName} sırası`,
    }));
  }, []);

  // Yeniden Başlatma (Reset)
  const handleReset = useCallback(() => {
    setGameState({
      turn: 'white',
      statusText: 'Oyun yeniden başlatıldı. Beyazın sırası...',
      whiteTime: initialTime,
      blackTime: initialTime,
      isPaused: false,
      historyIndex: 0,
      totalHistoryLength: 0,
      whiteName: defaultWhiteName,
      blackName: defaultBlackName,
      isGameOver: false,
      winner: null,
      boardRotates: options.boardRotates ?? false,
    });
  }, [initialTime, defaultWhiteName, defaultBlackName, options.boardRotates]);

  // Oyunu Bitirme (Terk / Beraberlik vb.)
  const resignGame = useCallback((resigningPlayer: PlayerTurn) => {
    const winningPlayer: PlayerTurn = resigningPlayer === 'white' ? 'black' : 'white';
    const winningName = winningPlayer === 'white' ? stateRef.current.whiteName : stateRef.current.blackName;
    setGameState((prev) => ({
      ...prev,
      isGameOver: true,
      winner: winningPlayer,
      statusText: `${resigningPlayer === 'white' ? prev.whiteName : prev.blackName} terk etti. Kazanan: ${winningName}!`,
    }));
  }, []);

  // Beraberlik
  const agreeDraw = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isGameOver: true,
      winner: 'draw',
      statusText: 'Karşılıklı anlaşma ile oyun berabere bitti.',
    }));
  }, []);

  // ─── Test Klavye Dinleyicisi (Space ile hamle simülasyonu) ─────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Yalnızca input/textarea odaklı değilken Space tuşunu dinle
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        makeSimulatedMove();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleUndo();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [makeSimulatedMove, handleUndo, handleRedo]);

  return {
    gameState,
    makeSimulatedMove,
    handleUndo,
    handleRedo,
    togglePause,
    handleReset,
    resignGame,
    agreeDraw,
    canUndo: gameState.historyIndex > 0,
    canRedo: gameState.historyIndex < gameState.totalHistoryLength,
  };
}
