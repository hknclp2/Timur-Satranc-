import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  BoardMatrix,
  BoardPosition,
  CitadelState,
  GameState,
  Move,
  Piece,
  PieceType,
  PlayerColor,
} from '../types/chess';
import { createInitialBoardSetup, createInitialGameState } from '../core/engine/boardSetup';
import { cloneBoard, cloneCitadels } from '../core/setup/setupSerializer';
import {
  calculateGameStatus,
  getLegalMoves,
  getPieceAt,
  processPawnPromotion,
} from '../core/engine/moveRules';
import { generateMoveNotation } from '../core/notation';

export interface MoveHistoryEntry {
  moveNumber: number; // 1, 2, 3, ... (1-indexed absolute move count)
  turnNumber: number; // 1, 1, 2, 2, ...
  player: PlayerColor;
  notation: string;
  from: BoardPosition;
  to: BoardPosition;
  capturedPiece?: Piece;
  promotion?: PieceType;
  boardState: BoardMatrix;
  citadelsState: CitadelState;
  capturedPiecesState: {
    white: Piece[];
    black: Piece[];
  };
  isCheck?: boolean;
  isCheckmate?: boolean;
}

export interface UseGameProps {
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  whiteName?: string;
  blackName?: string;
  boardRotates?: boolean;
  initialBoard?: BoardMatrix;
  initialCitadels?: CitadelState;
  initialTurn?: PlayerColor;
  initialHasUsedKingSwap?: { white: boolean; black: boolean };
  onMoveMade?: (move: Move, notation: string) => void;
  onGameOver?: (winner: PlayerColor | 'draw', reason: string) => void;
}

export function useGame({
  initialTimeSeconds = 600,
  incrementSeconds = 0,
  whiteName = 'Emir Timur',
  blackName = 'Yıldırım Bayezid',
  boardRotates = false,
  initialBoard,
  initialCitadels,
  initialTurn,
  initialHasUsedKingSwap,
  onMoveMade,
  onGameOver,
}: UseGameProps = {}) {
  // ── Gerçek oyun başlangıcı snapshot'ı (özel dizilim veya klasik) ──────────
  // Mount'ta bir kez yakalanır; hamle geçmişi görünümü (başlangıca git) ve
  // "Yeniden Başlat" hep bu dizilime döner. Böylece serbest dizilimle başlayan
  // oyun, klasik dizilime geri düşmez.
  const startSnapshotRef = useRef<{
    board: BoardMatrix;
    citadels: CitadelState;
    turn: PlayerColor;
  } | null>(null);
  if (startSnapshotRef.current === null) {
    if (initialBoard) {
      startSnapshotRef.current = {
        board: cloneBoard(initialBoard),
        citadels: initialCitadels ? cloneCitadels(initialCitadels) : { whiteCitadelPiece: null, blackCitadelPiece: null },
        turn: initialTurn || 'white',
      };
    } else {
      const classic = createInitialBoardSetup();
      startSnapshotRef.current = {
        board: classic.board,
        citadels: classic.citadels,
        turn: initialTurn || 'white',
      };
    }
  }
  const startSnapshot = startSnapshotRef.current;

  // Live Game State
  const [gameState, setGameState] = useState<GameState>(() => {
    if (initialBoard) {
      return {
        board: initialBoard,
        citadels: initialCitadels || { whiteCitadelPiece: null, blackCitadelPiece: null },
        currentTurn: initialTurn || 'white',
        moveHistory: [],
        capturedPieces: { white: [], black: [] },
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isGameOver: false,
        status: 'IN_PROGRESS',
        winner: null,
        hasUsedKingSwap: initialHasUsedKingSwap || { white: false, black: false },
        turnNumber: 1,
        halfMoveClock: 0,
      };
    }
    return createInitialGameState();
  });
  const [selectedPos, setSelectedPos] = useState<BoardPosition | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    move: Move;
    piece: Piece;
    defaultType: PieceType;
  } | null>(null);

  // Structured History Entries with Board Snapshots
  const [historyEntries, setHistoryEntries] = useState<MoveHistoryEntry[]>([]);

  // History Viewer State (null = Live State, -1 = Initial Start Position, 0..N-1 = specific move index)
  const [viewedMoveIndex, setViewedMoveIndex] = useState<number | null>(null);

  // Clocks and UI status (Strictly linked to LIVE game)
  const [whiteTime, setWhiteTime] = useState<number>(initialTimeSeconds);
  const [blackTime, setBlackTime] = useState<number>(initialTimeSeconds);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>(`${whiteName} hamle sırası...`);

  // History stack for full Undo/Redo actions
  const [historyStack, setHistoryStack] = useState<{
    gameState: GameState;
    historyEntries: MoveHistoryEntry[];
    whiteTime: number;
    blackTime: number;
  }[]>([]);
  const [redoStack, setRedoStack] = useState<{
    gameState: GameState;
    historyEntries: MoveHistoryEntry[];
    whiteTime: number;
    blackTime: number;
  }[]>([]);

  const stateRef = useRef({ gameState, historyEntries, whiteTime, blackTime, isPaused });
  stateRef.current = { gameState, historyEntries, whiteTime, blackTime, isPaused };

  // Timer interval - Runs strictly for LIVE active player, NEVER modified by history browsing
  useEffect(() => {
    if (isPaused || gameState.isGameOver || initialTimeSeconds <= 0) return;

    const interval = setInterval(() => {
      if (gameState.currentTurn === 'white') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setGameState((g) => ({ ...g, isGameOver: true, status: 'TIMEOUT', winner: 'black' }));
            setStatusText(`Süre bitti! ${blackName} kazandı.`);
            onGameOver?.('black', 'Beyazın süresi doldu!');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setGameState((g) => ({ ...g, isGameOver: true, status: 'TIMEOUT', winner: 'white' }));
            setStatusText(`Süre bitti! ${whiteName} kazandı.`);
            onGameOver?.('white', 'Siyahın süresi doldu!');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, gameState.isGameOver, gameState.currentTurn, initialTimeSeconds, whiteName, blackName, onGameOver]);

  // Current active index in history (-1 = Initial Board, 0..N-1 = Move, null when no moves yet)
  const currentViewedIndex =
    viewedMoveIndex !== null
      ? viewedMoveIndex
      : historyEntries.length > 0
      ? historyEntries.length - 1
      : null;

  // Viewing past history when viewing an earlier move than the latest
  const isViewingHistory =
    historyEntries.length > 0 &&
    currentViewedIndex !== null &&
    currentViewedIndex < historyEntries.length - 1;

  const displayedBoard = useMemo(() => {
    // -1 = başlangıç konumunu görüntüle → gerçek oyun başlangıcı (özel dizilim korunur)
    if (currentViewedIndex === -1) {
      return startSnapshot.board;
    }
    // null = hamle yok, canlı konum → o anki tahta (oyun başında = özel dizilim)
    if (currentViewedIndex === null) {
      return gameState.board;
    }
    const entry = historyEntries[currentViewedIndex];
    return entry ? entry.boardState : gameState.board;
  }, [currentViewedIndex, gameState.board, historyEntries, startSnapshot]);

  const displayedCitadels = useMemo(() => {
    if (currentViewedIndex === -1) {
      return startSnapshot.citadels;
    }
    if (currentViewedIndex === null) {
      return gameState.citadels;
    }
    const entry = historyEntries[currentViewedIndex];
    return entry ? entry.citadelsState : gameState.citadels;
  }, [currentViewedIndex, gameState.citadels, historyEntries, startSnapshot]);

  const displayedCapturedPieces = useMemo(() => {
    if (currentViewedIndex === -1) {
      return { white: [], black: [] };
    }
    if (currentViewedIndex === null) {
      return gameState.capturedPieces;
    }
    const entry = historyEntries[currentViewedIndex];
    return entry ? entry.capturedPiecesState : gameState.capturedPieces;
  }, [currentViewedIndex, gameState.capturedPieces, historyEntries]);

  const displayedLastMove = useMemo(() => {
    if (currentViewedIndex === -1 || currentViewedIndex === null) {
      return null;
    }
    const entry = historyEntries[currentViewedIndex];
    if (!entry) return lastMove;
    return {
      from: entry.from,
      to: entry.to,
      capturedPiece: entry.capturedPiece,
      promotion: entry.promotion,
      isKingSwap: entry.isCheck,
    };
  }, [currentViewedIndex, lastMove, historyEntries]);

  // Computed strictly legal moves for currently selected square (in Live mode)
  const validMoves = useMemo(() => {
    if (isViewingHistory || !selectedPos || gameState.isGameOver) return [];

    const selectedPiece = getPieceAt(selectedPos, gameState.board, gameState.citadels);
    if (!selectedPiece || selectedPiece.color !== gameState.currentTurn) return [];

    const allLegalMoves = getLegalMoves(
      gameState.currentTurn,
      gameState.board,
      gameState.citadels,
      gameState.hasUsedKingSwap
    );

    return allLegalMoves.filter((m) => {
      if (selectedPos.isCitadel && m.from.isCitadel) {
        return selectedPos.citadelSide === m.from.citadelSide;
      }
      return !selectedPos.isCitadel && !m.from.isCitadel && m.from.x === selectedPos.x && m.from.y === selectedPos.y;
    });
  }, [
    isViewingHistory,
    selectedPos,
    gameState.board,
    gameState.citadels,
    gameState.currentTurn,
    gameState.hasUsedKingSwap,
    gameState.isGameOver,
  ]);

  // Execute a verified move in Live game
  const executeMoveInternal = useCallback(
    (move: Move, promotionType?: PieceType) => {
      // Ensure we are in live view
      setViewedMoveIndex(null);

      setGameState((prev) => {
        const newBoard: BoardMatrix = prev.board.map((row) => [...row]);
        const newCitadels: CitadelState = {
          whiteCitadelPiece: prev.citadels.whiteCitadelPiece ? { ...prev.citadels.whiteCitadelPiece } : null,
          blackCitadelPiece: prev.citadels.blackCitadelPiece ? { ...prev.citadels.blackCitadelPiece } : null,
        };

        const newHasUsedKingSwap = { ...prev.hasUsedKingSwap };

        // 1. Moving piece
        let movingPiece: Piece | null = null;

        // Rule 2: Handle King Swap
        if (move.isKingSwap && move.swappedPiece) {
          const kingPiece = newBoard[move.from.y][move.from.x];
          const targetFriendly = newBoard[move.to.y][move.to.x];

          if (kingPiece && targetFriendly) {
            newBoard[move.to.y][move.to.x] = {
              ...kingPiece,
              position: move.to,
              hasMoved: true,
            };
            newBoard[move.from.y][move.from.x] = {
              ...targetFriendly,
              position: move.from,
            };
            newHasUsedKingSwap[prev.currentTurn] = true;
            movingPiece = kingPiece;
          }
        } else {
          // Standard Move / Capture / Citadel Move
          if (move.from.isCitadel) {
            if (move.from.citadelSide === 'left') {
              movingPiece = newCitadels.blackCitadelPiece;
              newCitadels.blackCitadelPiece = null;
            } else {
              movingPiece = newCitadels.whiteCitadelPiece;
              newCitadels.whiteCitadelPiece = null;
            }
          } else {
            movingPiece = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;
          }

          if (!movingPiece) return prev;

          // Handle Captures
          let capturedPiece = move.capturedPiece;
          if (!capturedPiece && !move.to.isCitadel) {
            capturedPiece = newBoard[move.to.y][move.to.x] || undefined;
          }

          // Rule 4: Handle Pawn Promotion Pipeline & Multi-stage Relocation
          let effectiveType = promotionType || move.promotion || movingPiece.type;
          let targetPosition = move.to;
          let newPawnStage = movingPiece.pawnOfPawnsStage;

          if (movingPiece.type === 'pawn') {
            const isPromotionRow = (movingPiece.color === 'white' && move.to.y === 9) || (movingPiece.color === 'black' && move.to.y === 0);
            if (isPromotionRow) {
              const promoResult = processPawnPromotion(movingPiece, move.to, newBoard, newCitadels, promotionType);
              effectiveType = promoResult.promotedType;
              if (promoResult.isRelocation && promoResult.relocationPos) {
                targetPosition = promoResult.relocationPos;
                newPawnStage = promoResult.newStage;
              } else if (promoResult.newStage !== undefined) {
                newPawnStage = promoResult.newStage;
              }
            }
          }

          const updatedPiece: Piece = {
            ...movingPiece,
            type: effectiveType,
            position: targetPosition,
            hasMoved: true,
            pawnOfPawnsStage: newPawnStage,
          };

          if (targetPosition.isCitadel) {
            if (targetPosition.citadelSide === 'left') {
              newCitadels.blackCitadelPiece = updatedPiece;
            } else {
              newCitadels.whiteCitadelPiece = updatedPiece;
            }
          } else {
            newBoard[targetPosition.y][targetPosition.x] = updatedPiece;
          }
        }

        if (!movingPiece) return prev;

        // 2. Captures State
        const newCaptured = {
          white: [...prev.capturedPieces.white],
          black: [...prev.capturedPieces.black],
        };

        const capturedPiece = move.capturedPiece || (!move.isKingSwap && !move.to.isCitadel ? prev.board[move.to.y][move.to.x] || undefined : undefined);
        if (capturedPiece && !move.isKingSwap) {
          if (capturedPiece.color === 'white') {
            newCaptured.white.push(capturedPiece);
          } else {
            newCaptured.black.push(capturedPiece);
          }
        }

        // 3. Next Turn & Game Status Evaluation
        const nextTurn: PlayerColor = prev.currentTurn === 'white' ? 'black' : 'white';

        const nextStateCandidate: GameState = {
          ...prev,
          board: newBoard,
          citadels: newCitadels,
          currentTurn: nextTurn,
          hasUsedKingSwap: newHasUsedKingSwap,
          capturedPieces: newCaptured,
        };

        const statusResult = calculateGameStatus(nextStateCandidate);

        const notation = generateMoveNotation(
          { ...move, capturedPiece, promotion: promotionType },
          movingPiece,
          statusResult.isCheck,
          statusResult.isCheckmate
        );

        const newMove = { ...move, san: notation, capturedPiece, promotion: promotionType };
        const newMoveHistory = [...prev.moveHistory, newMove];

        setStatusText(statusResult.reason);
        if (statusResult.isGameOver) {
          onGameOver?.(statusResult.winner || 'draw', statusResult.reason);
        }

        // Create structured history entry
        const historyEntry: MoveHistoryEntry = {
          moveNumber: newMoveHistory.length,
          turnNumber: prev.turnNumber,
          player: prev.currentTurn,
          notation,
          from: move.from,
          to: move.to,
          capturedPiece,
          promotion: promotionType,
          boardState: newBoard,
          citadelsState: newCitadels,
          capturedPiecesState: newCaptured,
          isCheck: statusResult.isCheck,
          isCheckmate: statusResult.isCheckmate,
        };

        setHistoryEntries((prevEntries) => [...prevEntries, historyEntry]);

        // Save history for undo
        setHistoryStack((h) => [
          ...h,
          {
            gameState: prev,
            historyEntries: stateRef.current.historyEntries,
            whiteTime: stateRef.current.whiteTime,
            blackTime: stateRef.current.blackTime,
          },
        ]);
        setRedoStack([]);
        setLastMove(newMove);

        onMoveMade?.(move, notation);

        return {
          ...prev,
          board: newBoard,
          citadels: newCitadels,
          currentTurn: nextTurn,
          capturedPieces: newCaptured,
          moveHistory: newMoveHistory,
          isCheck: statusResult.isCheck,
          isCheckmate: statusResult.isCheckmate,
          isStalemate: statusResult.isStalemate,
          isGameOver: statusResult.isGameOver,
          status: statusResult.status,
          statusReason: statusResult.reason,
          winner: statusResult.winner,
          hasUsedKingSwap: newHasUsedKingSwap,
          turnNumber: nextTurn === 'white' ? prev.turnNumber + 1 : prev.turnNumber,
        };
      });

      // Fischer increment: add increment to the player who just moved
      if (incrementSeconds > 0) {
        setGameState((current) => {
          const playerWhoMoved = current.currentTurn === 'white' ? 'black' : 'white';
          if (playerWhoMoved === 'white') {
            setWhiteTime((t) => t + incrementSeconds);
          } else {
            setBlackTime((t) => t + incrementSeconds);
          }
          return current;
        });
      }

      setSelectedPos(null);
    },
    [incrementSeconds, onMoveMade, onGameOver]
  );

  // History Navigation Controls
  const goToMove = useCallback((index: number | null) => {
    setSelectedPos(null);
    const count = historyEntries.length;
    if (count === 0) {
      setViewedMoveIndex(null);
      return;
    }
    if (index === null) {
      setViewedMoveIndex(count - 1);
    } else {
      setViewedMoveIndex(Math.max(-1, Math.min(count - 1, index)));
    }
  }, [historyEntries.length]);

  const goToPreviousMove = useCallback(() => {
    setSelectedPos(null);
    const count = historyEntries.length;
    if (count === 0) return;

    setViewedMoveIndex((prev) => {
      const current = prev !== null ? prev : count - 1;
      return Math.max(-1, current - 1);
    });
  }, [historyEntries.length]);

  const goToNextMove = useCallback(() => {
    setSelectedPos(null);
    const count = historyEntries.length;
    if (count === 0) return;

    setViewedMoveIndex((prev) => {
      const current = prev !== null ? prev : count - 1;
      return Math.min(count - 1, current + 1);
    });
  }, [historyEntries.length]);

  const goToLive = useCallback(() => {
    setSelectedPos(null);
    setViewedMoveIndex(historyEntries.length > 0 ? historyEntries.length - 1 : null);
  }, [historyEntries.length]);

  // Click handler on board square or citadel
  const handleSelectSquare = useCallback(
    (pos: BoardPosition) => {
      // If user is currently viewing history, ignore board clicks so history view remains intact
      if (viewedMoveIndex !== null) {
        return;
      }

      if (gameState.isGameOver || isPaused) return;

      // 1. If a piece is already selected
      if (selectedPos) {
        // Deselect if clicked same square
        if (
          (pos.isCitadel && selectedPos.isCitadel && pos.citadelSide === selectedPos.citadelSide) ||
          (!pos.isCitadel && !selectedPos.isCitadel && pos.x === selectedPos.x && pos.y === selectedPos.y)
        ) {
          setSelectedPos(null);
          return;
        }

        // Check if destination is in valid moves
        const targetMove = validMoves.find((m) => {
          if (pos.isCitadel && m.to.isCitadel) {
            return pos.citadelSide === m.to.citadelSide;
          }
          return !pos.isCitadel && !m.to.isCitadel && m.to.x === pos.x && m.to.y === pos.y;
        });

        if (targetMove) {
          let piece: Piece | null = null;
          if (selectedPos.isCitadel) {
            piece =
              selectedPos.citadelSide === 'left'
                ? gameState.citadels.blackCitadelPiece
                : gameState.citadels.whiteCitadelPiece;
          } else {
            piece = gameState.board[selectedPos.y][selectedPos.x];
          }

          if (piece && piece.type === 'pawn' && targetMove.promotion) {
            setPendingPromotion({
              move: targetMove,
              piece,
              defaultType: targetMove.promotion,
            });
            return;
          }

          executeMoveInternal(targetMove);
          return;
        }

        // If clicked own piece, switch selection
        const clickedPiece = pos.isCitadel
          ? pos.citadelSide === 'left'
            ? gameState.citadels.blackCitadelPiece
            : gameState.citadels.whiteCitadelPiece
          : gameState.board[pos.y][pos.x];

        if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
          setSelectedPos(pos);
          return;
        }

        setSelectedPos(null);
        return;
      }

      // 2. Select initial piece
      const clickedPiece = pos.isCitadel
        ? pos.citadelSide === 'left'
          ? gameState.citadels.blackCitadelPiece
          : gameState.citadels.whiteCitadelPiece
        : gameState.board[pos.y][pos.x];

      if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
        setSelectedPos(pos);
      }
    },
    [viewedMoveIndex, goToLive, gameState, isPaused, selectedPos, validMoves, executeMoveInternal]
  );

  // Complete pawn promotion
  const resolvePromotion = useCallback(
    (chosenType: PieceType) => {
      if (!pendingPromotion) return;
      executeMoveInternal(pendingPromotion.move, chosenType);
      setPendingPromotion(null);
    },
    [pendingPromotion, executeMoveInternal]
  );

  // Drag & drop: tüm oyun modlarında sürükle-bırak ile hamle yap
  const handleDropMove = useCallback(
    (from: BoardPosition, to: BoardPosition) => {
      if (viewedMoveIndex !== null) return;
      if (gameState.isGameOver || isPaused) return;

      const sameSquare =
        !!from.isCitadel === !!to.isCitadel &&
        (from.isCitadel
          ? from.citadelSide === to.citadelSide
          : from.x === to.x && from.y === to.y);
      if (sameSquare) return;

      const movingPiece = from.isCitadel
        ? from.citadelSide === 'left'
          ? gameState.citadels.blackCitadelPiece
          : gameState.citadels.whiteCitadelPiece
        : gameState.board[from.y]?.[from.x];

      if (!movingPiece || movingPiece.color !== gameState.currentTurn) return;

      const allLegalMoves = getLegalMoves(
        gameState.currentTurn,
        gameState.board,
        gameState.citadels,
        gameState.hasUsedKingSwap
      );

      const targetMove = allLegalMoves.find((m) => {
        const fromMatch = from.isCitadel
          ? m.from.isCitadel && m.from.citadelSide === from.citadelSide
          : !m.from.isCitadel && !from.isCitadel && m.from.x === from.x && m.from.y === from.y;
        if (!fromMatch) return false;
        if (to.isCitadel) return m.to.isCitadel && m.to.citadelSide === to.citadelSide;
        return !m.to.isCitadel && !to.isCitadel && m.to.x === to.x && m.to.y === to.y;
      });

      if (!targetMove) return;

      if (movingPiece.type === 'pawn' && targetMove.promotion) {
        setSelectedPos(from);
        setPendingPromotion({
          move: targetMove,
          piece: movingPiece,
          defaultType: targetMove.promotion,
        });
        return;
      }

      executeMoveInternal(targetMove);
    },
    [viewedMoveIndex, gameState, isPaused, executeMoveInternal]
  );

  // Undo (Moves live game back 1 turn)
  const undoMove = useCallback(() => {
    if (historyStack.length === 0) return;
    const lastItem = historyStack[historyStack.length - 1];
    setRedoStack((r) => [
      ...r,
      { gameState, historyEntries, whiteTime, blackTime },
    ]);
    setHistoryStack((h) => h.slice(0, -1));
    setGameState(lastItem.gameState);
    setHistoryEntries(lastItem.historyEntries);
    setWhiteTime(lastItem.whiteTime);
    setBlackTime(lastItem.blackTime);
    setViewedMoveIndex(null);
    setSelectedPos(null);
    setLastMove(
      lastItem.gameState.moveHistory.length > 0
        ? lastItem.gameState.moveHistory[lastItem.gameState.moveHistory.length - 1]
        : null
    );
    const turnName = lastItem.gameState.currentTurn === 'white' ? whiteName : blackName;
    setStatusText(`Hamle geri alındı (${turnName} sırası)`);
  }, [historyStack, gameState, historyEntries, whiteTime, blackTime, whiteName, blackName]);

  // Redo (Re-applies previously undone move)
  const redoMove = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextItem = redoStack[redoStack.length - 1];
    setHistoryStack((h) => [
      ...h,
      { gameState, historyEntries, whiteTime, blackTime },
    ]);
    setRedoStack((r) => r.slice(0, -1));
    setGameState(nextItem.gameState);
    setHistoryEntries(nextItem.historyEntries);
    setWhiteTime(nextItem.whiteTime);
    setBlackTime(nextItem.blackTime);
    setViewedMoveIndex(null);
    setSelectedPos(null);
    setLastMove(
      nextItem.gameState.moveHistory.length > 0
        ? nextItem.gameState.moveHistory[nextItem.gameState.moveHistory.length - 1]
        : null
    );
    const turnName = nextItem.gameState.currentTurn === 'white' ? whiteName : blackName;
    setStatusText(`Hamle ileri alındı (${turnName} sırası)`);
  }, [redoStack, gameState, historyEntries, whiteTime, blackTime, whiteName, blackName]);

  // Pause / Resume
  const togglePause = useCallback(() => {
    setIsPaused((p) => {
      const next = !p;
      setStatusText(next ? 'Oyun duraklatıldı.' : `${gameState.currentTurn === 'white' ? whiteName : blackName} sırası`);
      return next;
    });
  }, [gameState.currentTurn, whiteName, blackName]);

  // Reset Game — her zaman GERÇEK oyun başlangıcına döner (özel dizilim korunur)
  const resetGame = useCallback(() => {
    const starter = startSnapshot.turn;
    setGameState({
      board: cloneBoard(startSnapshot.board),
      citadels: cloneCitadels(startSnapshot.citadels),
      currentTurn: starter,
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isGameOver: false,
      status: 'IN_PROGRESS',
      winner: null,
      hasUsedKingSwap: { white: false, black: false },
      turnNumber: 1,
      halfMoveClock: 0,
    });
    setHistoryEntries([]);
    setViewedMoveIndex(null);
    setSelectedPos(null);
    setLastMove(null);
    setPendingPromotion(null);
    setWhiteTime(initialTimeSeconds);
    setBlackTime(initialTimeSeconds);
    setIsPaused(false);
    setStatusText(`${starter === 'white' ? whiteName : blackName} hamle sırası...`);
    setHistoryStack([]);
    setRedoStack([]);
  }, [startSnapshot, initialTimeSeconds, whiteName, blackName]);

  // Resign Game
  const resignGame = useCallback(
    (player: PlayerColor) => {
      const winner: PlayerColor = player === 'white' ? 'black' : 'white';
      const winnerName = winner === 'white' ? whiteName : blackName;
      const loserName = player === 'white' ? whiteName : blackName;
      setGameState((prev) => ({
        ...prev,
        isGameOver: true,
        winner,
      }));
      setStatusText(`${loserName} terk etti. Kazanan: ${winnerName}!`);
      onGameOver?.(winner, `${loserName} oyunu terk etti.`);
    },
    [whiteName, blackName, onGameOver]
  );

  // Agree Draw
  const agreeDraw = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isGameOver: true,
      winner: 'draw',
    }));
    setStatusText('Karşılıklı anlaşma ile oyun berabere bitti.');
    onGameOver?.('draw', 'Beraberlik sağlandı.');
  }, [onGameOver]);

  return {
    // Live State
    gameState,
    whiteTime,
    blackTime,
    isPaused,
    statusText,
    boardRotates,
    whiteName,
    blackName,
    selectedPos,
    validMoves,
    lastMove,
    pendingPromotion,

    // Displayed / History View State
    displayedBoard,
    displayedCitadels,
    displayedCapturedPieces,
    displayedLastMove,
    historyEntries,
    viewedMoveIndex,
    isViewingHistory,

    // Navigation & Actions
    handleSelectSquare,
    handleDropMove,
    resolvePromotion,
    goToMove,
    goToPreviousMove,
    goToNextMove,
    goToLive,
    undoMove,
    redoMove,
    togglePause,
    resetGame,
    resignGame,
    agreeDraw,
    canUndo: historyStack.length > 0,
    canRedo: redoStack.length > 0,
    canGoPrevious: historyEntries.length > 0 && (currentViewedIndex === null ? false : currentViewedIndex > -1),
    canGoNext: historyEntries.length > 0 && (currentViewedIndex === null ? false : currentViewedIndex < historyEntries.length - 1),
  };
}
