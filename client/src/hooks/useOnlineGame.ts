import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { applyGameResult } from '../core/online/ratingService';
import {
  abortGame,
  fetchMoveHistory,
  respondDrawOffer,
  sendDrawOffer,
  sendMove,
  sendRematchOffer,
  sendTakebackOffer,
  updateGameStatus,
  type OnlineMoveData,
} from '../core/online/moveService';
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
  /** syncGameEnd sonrası ELO uygular (hatada oyunu bozmaz, sadece console.error). */
  syncGameEndWithRating: (winner: PlayerColor | 'draw', reason: string) => Promise<void>;
  // ─── Faz 2 — online protokol (mevcut sync'leri bozmaz) ───
  syncDrawOffer: () => Promise<void>;
  syncRespondDrawOffer: (accept: boolean) => Promise<void>;
  syncTakebackOffer: () => Promise<void>;
  syncRematchOffer: () => Promise<void>;
  syncAbortGame: (reason?: string) => Promise<void>;
  /** Reconnect sonrası hamle geçmişini çekip döndürür (rebuild için). */
  rebuildFromHistory: () => Promise<{ moves: any[]; error: any }>;
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
    const supabase = getSupabase();
    if (!supabase) {
      // Supabase yapılandırılmamış: abonelik kurulamaz, uygulama çalışmaya devam eder.
      setConnectionStatus('error');
      return;
    }

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

  const syncGameEndWithRating = useCallback(
    async (winner: PlayerColor | 'draw', reason: string): Promise<void> => {
      try {
        await syncGameEnd(winner, reason);
      } catch (err) {
        console.error('[useOnlineGame] syncGameEndWithRating sync failed:', err);
      }
      try {
        const { error } = await applyGameResult(gameDataRef.current.id, winner);
        if (error) console.error('[useOnlineGame] syncGameEndWithRating rating failed:', error);
      } catch (err) {
        console.error('[useOnlineGame] syncGameEndWithRating rating failed:', err);
      }
    },
    [syncGameEnd]
  );

  // ─── Faz 2 — online protokol sync'leri (updateGameStatus wrapper'ları) ───
  const syncDrawOffer = useCallback(async (): Promise<void> => {
    try {
      const { error } = await sendDrawOffer(gameDataRef.current.id, myColorRef.current);
      if (error) console.error('[useOnlineGame] syncDrawOffer failed:', error);
    } catch (err) {
      console.error('[useOnlineGame] syncDrawOffer failed:', err);
    }
  }, []);

  const syncRespondDrawOffer = useCallback(async (accept: boolean): Promise<void> => {
    try {
      const { error } = await respondDrawOffer(gameDataRef.current.id, accept);
      if (error) console.error('[useOnlineGame] syncRespondDrawOffer failed:', error);
    } catch (err) {
      console.error('[useOnlineGame] syncRespondDrawOffer failed:', err);
    }
  }, []);

  const syncTakebackOffer = useCallback(async (): Promise<void> => {
    try {
      const { error } = await sendTakebackOffer(gameDataRef.current.id, myColorRef.current);
      if (error) console.error('[useOnlineGame] syncTakebackOffer failed:', error);
    } catch (err) {
      console.error('[useOnlineGame] syncTakebackOffer failed:', err);
    }
  }, []);

  const syncRematchOffer = useCallback(async (): Promise<void> => {
    try {
      const { error } = await sendRematchOffer(gameDataRef.current.id, myColorRef.current);
      if (error) console.error('[useOnlineGame] syncRematchOffer failed:', error);
    } catch (err) {
      console.error('[useOnlineGame] syncRematchOffer failed:', err);
    }
  }, []);

  const syncAbortGame = useCallback(async (reason = 'abort'): Promise<void> => {
    try {
      const { error } = await abortGame(gameDataRef.current.id, reason);
      if (error) console.error('[useOnlineGame] syncAbortGame failed:', error);
    } catch (err) {
      console.error('[useOnlineGame] syncAbortGame failed:', err);
    }
  }, []);

  /**
   * Reconnect sonrası hamle geçmişini DB'den çekip döndürür.
   * Yerel useGame state'ine OTOMATİK yazmaz (v2'de applyRemoteSnapshot ile
   * useGame'e dokunmadan eklenecek); çağıran taraf rebuild için kullanır.
   */
  const rebuildFromHistory = useCallback(async (): Promise<{ moves: any[]; error: any }> => {
    try {
      const { data, error } = await fetchMoveHistory(gameDataRef.current.id);
      if (error) {
        console.error('[useOnlineGame] rebuildFromHistory failed:', error);
        return { moves: [], error };
      }
      return { moves: data ?? [], error: null };
    } catch (err) {
      console.error('[useOnlineGame] rebuildFromHistory failed:', err);
      return { moves: [], error: err };
    }
  }, []);

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
    syncGameEndWithRating,
    syncDrawOffer,
    syncRespondDrawOffer,
    syncTakebackOffer,
    syncRematchOffer,
    syncAbortGame,
    rebuildFromHistory,
  };
}
