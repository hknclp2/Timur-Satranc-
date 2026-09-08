import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sendMove, updateGameStatus, type OnlineMoveData } from '../core/online/moveService';
import type { OnlineGame } from '../core/online/roomService';
import type { MoveHistoryEntry } from './useGame';
import type { PlayerColor } from '../types/chess';

export type OnlineConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseOnlineGameProps {
  gameCode: string;
  myColor: PlayerColor;
  initialGameData: OnlineGame;
}

export interface UseOnlineGameReturn {
  gameData: OnlineGame;
  myColor: PlayerColor;
  isMyTurn: boolean;
  connectionStatus: OnlineConnectionStatus;
  opponentJoined: boolean;
  isGameOver: boolean;
  syncMove: (entry: MoveHistoryEntry, moveIndex: number) => Promise<void>;
  syncResignation: () => Promise<void>;
  syncDraw: () => Promise<void>;
  syncGameEnd: (winner: PlayerColor | 'draw', reason: string) => Promise<void>;
}

export function useOnlineGame(props: UseOnlineGameProps): UseOnlineGameReturn {
  const { gameCode, myColor, initialGameData } = props;

  const [gameData, setGameData] = useState<OnlineGame>(initialGameData);
  const [connectionStatus, setConnectionStatus] = useState<OnlineConnectionStatus>('connecting');

  // Stale closure onlemi: tum sync fonksiyonlari bos deps + ref kullanir.
  const gameDataRef = useRef<OnlineGame>(initialGameData);
  gameDataRef.current = gameData;
  const myColorRef = useRef<PlayerColor>(myColor);
  myColorRef.current = myColor;

  // --- Realtime senkronizasyon: rakip hamleleri / durum degisiklikleri ---
  useEffect(() => {
    setConnectionStatus('connecting');

    const channel = supabase
      .channel('online_game_' + gameCode)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_games',
          filter: 'code=eq.' + gameCode,
        },
        (payload) => {
          const next = (payload as any).new as OnlineGame | null | undefined;
          if (next) setGameData(next);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
        } else {
          // TIMED_OUT / CLOSED
          setConnectionStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode]);

  const syncMove = useCallback(async (entry: MoveHistoryEntry, moveIndex: number): Promise<void> => {
    try {
      const gameId = gameDataRef.current.id;
      const moveNumber = moveIndex + 1;
      // Hamleden SONRAKI durum DB'ye yazilir: sira rakibe gecer.
      const nextTurn: PlayerColor = entry.player === 'white' ? 'black' : 'white';
      // KRITIK KARAR (pieceType): MoveHistoryEntry.capturedPiece YENILEN tastir,
      // asla hamle yapan tas olarak kullanilmaz. Hamleyi yapan tas, hamle SONRASI
      // board snapshot'inda `to` karesindeki tastir (terfi dahil dogru tipi verir).
      let pieceType = 'pawn';
      try {
        const after: any = (entry as any).boardState;
        const t: any = (entry as any).to;
        if (after && t && !t.isCitadel && Array.isArray(after[t.y]) && after[t.y][t.x]?.type) {
          pieceType = after[t.y][t.x].type;
        }
      } catch {
        pieceType = 'pawn';
      }
      const move: OnlineMoveData = {
        board_state: entry.boardState,
        citadels_state: entry.citadelsState,
        captured_pieces: entry.capturedPiecesState,
        current_turn: nextTurn,
        // useGame'de turnNumber siyah oynayinca artar (nextTurn white ise +1).
        turn_number: entry.player === 'black' ? entry.turnNumber + 1 : entry.turnNumber,
        move_count: moveNumber,
        last_move: {
          from: entry.from,
          to: entry.to,
          notation: entry.notation,
          player: entry.player,
        },
        player: entry.player,
        from: entry.from,
        to: entry.to,
        notation: entry.notation,
        piece_type: pieceType,
        captured_piece_type: (entry as any).capturedPiece?.type ?? null,
        promotion: (entry as any).promotion ?? null,
        is_check: !!(entry as any).isCheck,
        is_checkmate: !!(entry as any).isCheckmate,
      };
      const { error } = await sendMove(gameId, move);
      if (error) console.error('[useOnlineGame] syncMove failed:', error);
    } catch (err) {
      console.error('[useOnlineGame] syncMove failed:', err);
    }
  }, []);

  const syncResignation = useCallback(async (): Promise<void> => {
    try {
      const winner: PlayerColor = myColorRef.current === 'white' ? 'black' : 'white';
      const { error } = await updateGameStatus(gameDataRef.current.id, {
        status: 'ended',
        winner,
        end_reason: 'resignation',
        status_reason: 'resignation',
      });
      if (error) console.error('[useOnlineGame] syncResignation failed:', error);
    } catch (err) {
      console.error('[useOnlineGame] syncResignation failed:', err);
    }
  }, []);

  const syncDraw = useCallback(async (): Promise<void> => {
    try {
      const { error } = await updateGameStatus(gameDataRef.current.id, {
        status: 'ended',
        winner: 'draw',
        end_reason: 'agreement',
        status_reason: 'agreement',
      });
      if (error) console.error('[useOnlineGame] syncDraw failed:', error);
    } catch (err) {
      console.error('[useOnlineGame] syncDraw failed:', err);
    }
  }, []);

  const syncGameEnd = useCallback(
    async (winner: PlayerColor | 'draw', reason: string): Promise<void> => {
      try {
        const { error } = await updateGameStatus(gameDataRef.current.id, {
          status: 'ended',
          winner,
          end_reason: reason,
          status_reason: reason,
        });
        if (error) console.error('[useOnlineGame] syncGameEnd failed:', error);
      } catch (err) {
        console.error('[useOnlineGame] syncGameEnd failed:', err);
      }
    },
    []
  );

  const isMyTurn = gameData.current_turn === myColor;
  // KRITIK KARAR (opponentJoined): sadece status==='active' degil;
  // black_player_id doluysa rakip katilmis demektir (beyaz kurucu 'waiting'
  // iken kendi bekleme ekranini kendisi gosterir).
  const opponentJoined = gameData.black_player_id != null || gameData.status === 'active';
  const isGameOver = gameData.status === 'ended';

  return {
    gameData,
    myColor,
    isMyTurn,
    connectionStatus,
    opponentJoined,
    isGameOver,
    syncMove,
    syncResignation,
    syncDraw,
    syncGameEnd,
  };
}
