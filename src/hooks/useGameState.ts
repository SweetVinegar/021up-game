import { useState, useCallback, useEffect } from 'react';
import { GameRoom, Question, Participant, Answer, User } from '../types';
import { gameService } from '../services/gameService';
import { supabase } from '../lib/supabase';

export const useGameState = () => {
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      // 模擬錢包連接 - 實際應用中會使用 MetaMask
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x9876543210987654321098765432109876543210',
      ];
      const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
      
      const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      // 創建一個臨時用戶來模擬錢包連接
      // 在實際應用中，這裡會使用真實的錢包簽名來驗證身份
      const tempEmail = `${randomAddress.slice(2, 10)}@wallet.local`;
      const tempPassword = randomAddress; // 使用地址作為密碼（僅用於演示）
      
      try {
        // 嘗試登入現有用戶
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: tempEmail,
          password: tempPassword,
        });

        if (signInError && signInError.message.includes('Invalid login credentials')) {
          // 如果用戶不存在，創建新用戶
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: tempEmail,
            password: tempPassword,
            options: {
              data: {
                wallet_address: randomAddress,
                display_name: randomName,
              }
            }
          });

          if (signUpError) {
            throw signUpError;
          }
        } else if (signInError) {
          throw signInError;
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        // 如果認證失敗，仍然設置用戶但不進行 Supabase 操作
        setUser({
          address: randomAddress,
          name: randomName,
          balance: 1000 + Math.floor(Math.random() * 5000),
        });
        return;
      }
      
      setUser({
        address: randomAddress,
        name: randomName,
        balance: 1000 + Math.floor(Math.random() * 5000),
      });
    } catch (error) {
      console.error('連接錢包失敗:', error);
      // 即使認證失敗，也允許用戶繼續使用應用（離線模式）
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x9876543210987654321098765432109876543210',
      ];
      const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
      
      const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      setUser({
        address: randomAddress,
        name: randomName,
        balance: 1000 + Math.floor(Math.random() * 5000),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('登出失敗:', error);
    }
    setUser(null);
    setGameRoom(null);
  }, []);

  const createGame = useCallback(async (gameData: Partial<GameRoom>) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // 檢查是否已認證
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('未認證，使用本地模式創建遊戲');
        // 在本地模式下創建遊戲
        const localGame: GameRoom = {
          id: `local-${Date.now()}`,
          name: gameData.name || '',
          organizer: user.address,
          questions: gameData.questions || [],
          tokenReward: gameData.tokenReward || 0,
          tokenSymbol: gameData.tokenSymbol || 'QUIZ',
          status: 'waiting',
          participants: [],
          currentQuestionIndex: 0,
        };
        setGameRoom(localGame);
        return;
      }
      
      // 在 Supabase 中創建遊戲
      const gameId = await gameService.createGame({
        name: gameData.name || '',
        organizerAddress: user.address,
        questions: gameData.questions?.map((q, index) => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          timeLimit: q.timeLimit,
        })) || [],
        tokenReward: gameData.tokenReward || 0,
        tokenSymbol: gameData.tokenSymbol || 'QUIZ',
      });

      // 從資料庫載入完整遊戲資料
      await loadGame(gameId);
      
      // 扣除質押代幣
      const totalStaked = (gameData.tokenReward || 0) * (gameData.questions?.length || 0);
      setUser(prev => prev ? { ...prev, balance: prev.balance - totalStaked } : null);
      
    } catch (error) {
      console.error('創建遊戲失敗:', error);
      // 降級到本地模式
      const localGame: GameRoom = {
        id: `local-${Date.now()}`,
        name: gameData.name || '',
        organizer: user.address,
        questions: gameData.questions || [],
        tokenReward: gameData.tokenReward || 0,
        tokenSymbol: gameData.tokenSymbol || 'QUIZ',
        status: 'waiting',
        participants: [],
        currentQuestionIndex: 0,
      };
      setGameRoom(localGame);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadGame = useCallback(async (gameId: string) => {
    try {
      // 檢查是否為本地遊戲
      if (gameId.startsWith('local-')) {
        return;
      }

      const gameData = await gameService.getGame(gameId);
      
      // 轉換資料庫格式為前端格式
      const gameRoom: GameRoom = {
        id: gameData.id,
        name: gameData.name,
        organizer: gameData.organizer_address,
        questions: gameData.questions.map((q: any) => ({
          id: q.id,
          question: q.question_text,
          options: q.options,
          correctAnswer: q.correct_answer,
          timeLimit: q.time_limit,
        })),
        tokenReward: gameData.token_reward_per_question,
        tokenSymbol: gameData.token_symbol,
        status: gameData.status,
        participants: gameData.participants.map((p: any) => ({
          id: p.id,
          address: p.wallet_address,
          name: p.name,
          score: p.score,
          answers: [], // 稍後載入
          tokensEarned: p.tokens_earned,
        })),
        currentQuestionIndex: gameData.current_question_index,
        startTime: gameData.start_time ? new Date(gameData.start_time).getTime() : undefined,
      };

      setGameRoom(gameRoom);
    } catch (error) {
      console.error('載入遊戲失敗:', error);
    }
  }, []);

  const joinGame = useCallback(async (playerName: string) => {
    if (!gameRoom || !user) return;

    try {
      setLoading(true);
      
      // 檢查是否為本地遊戲
      if (gameRoom.id.startsWith('local-')) {
        const newParticipant: Participant = {
          id: `participant-${Date.now()}`,
          address: user.address,
          name: playerName,
          score: 0,
          answers: [],
          tokensEarned: 0,
        };
        
        setGameRoom(prev => prev ? {
          ...prev,
          participants: [...prev.participants, newParticipant],
        } : null);
        return;
      }
      
      await gameService.joinGame(gameRoom.id, {
        walletAddress: user.address,
        name: playerName,
      });

      // 重新載入遊戲資料
      await loadGame(gameRoom.id);
      
    } catch (error) {
      console.error('加入遊戲失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [gameRoom, user, loadGame]);

  const startGame = useCallback(async () => {
    if (!gameRoom) return;

    try {
      setLoading(true);
      
      // 檢查是否為本地遊戲
      if (gameRoom.id.startsWith('local-')) {
        setGameRoom(prev => prev ? {
          ...prev,
          status: 'active',
          startTime: Date.now(),
        } : null);
        return;
      }
      
      await gameService.startGame(gameRoom.id);
      
      // 重新載入遊戲資料
      await loadGame(gameRoom.id);
      
    } catch (error) {
      console.error('開始遊戲失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [gameRoom, loadGame]);

  const submitAnswer = useCallback(async (answer: Answer) => {
    if (!gameRoom || !user) return;

    try {
      const participant = gameRoom.participants.find(p => p.address === user.address);
      if (!participant) return;

      const currentQuestion = gameRoom.questions[gameRoom.currentQuestionIndex];
      
      // 檢查是否為本地遊戲
      if (!gameRoom.id.startsWith('local-')) {
        await gameService.submitAnswer({
          participantId: participant.id,
          questionId: currentQuestion.id,
          selectedOption: answer.selectedOption,
          timeToAnswer: answer.timeToAnswer,
          isCorrect: answer.isCorrect,
        });
      }

      // 更新本地狀態
      setGameRoom(prev => {
        if (!prev) return null;

        const updatedParticipants = prev.participants.map(p => {
          if (p.address === user.address) {
            const updatedAnswers = [...p.answers, answer];
            let newScore = p.score;
            let tokensEarned = p.tokensEarned;

            if (answer.isCorrect) {
              const speedBonus = Math.max(0, 1000 - answer.timeToAnswer);
              newScore += 1000 + Math.floor(speedBonus / 10);
              tokensEarned += prev.tokenReward;
            }

            return {
              ...p,
              answers: updatedAnswers,
              score: newScore,
              tokensEarned,
            };
          }
          return p;
        });

        return {
          ...prev,
          participants: updatedParticipants,
        };
      });
      
    } catch (error) {
      console.error('提交答案失敗:', error);
    }
  }, [gameRoom, user]);

  const nextQuestion = useCallback(async () => {
    if (!gameRoom) return;

    try {
      const nextIndex = gameRoom.currentQuestionIndex + 1;
      
      // 檢查是否為本地遊戲
      if (!gameRoom.id.startsWith('local-')) {
        await gameService.updateGameQuestion(gameRoom.id, nextIndex);
      }
      
      setGameRoom(prev => prev ? {
        ...prev,
        currentQuestionIndex: nextIndex,
      } : null);
      
    } catch (error) {
      console.error('下一題失敗:', error);
    }
  }, [gameRoom]);

  const completeGame = useCallback(async () => {
    if (!gameRoom) return;

    try {
      setLoading(true);
      
      // 檢查是否為本地遊戲
      if (gameRoom.id.startsWith('local-')) {
        setGameRoom(prev => prev ? {
          ...prev,
          status: 'completed',
        } : null);
        
        // 更新用戶餘額
        const participant = gameRoom.participants.find(p => p.address === user?.address);
        if (participant && participant.tokensEarned > 0) {
          setUser(prevUser => prevUser ? {
            ...prevUser,
            balance: prevUser.balance + participant.tokensEarned,
          } : null);
        }
        return;
      }
      
      // 準備獎勵分配資料
      const results = gameRoom.participants.map(participant => ({
        participantId: participant.id,
        walletAddress: participant.address,
        tokensEarned: participant.tokensEarned,
      }));

      await gameService.completeGame(gameRoom.id, results);
      
      // 更新用戶餘額
      const participant = gameRoom.participants.find(p => p.address === user?.address);
      if (participant && participant.tokensEarned > 0) {
        setUser(prevUser => prevUser ? {
          ...prevUser,
          balance: prevUser.balance + participant.tokensEarned,
        } : null);
      }

      // 重新載入遊戲資料
      await loadGame(gameRoom.id);
      
    } catch (error) {
      console.error('完成遊戲失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [gameRoom, user, loadGame]);

  const resetGame = useCallback(() => {
    setGameRoom(null);
  }, []);

  // 設定即時更新監聽器
  useEffect(() => {
    if (!gameRoom || gameRoom.id.startsWith('local-')) return;

    const channel = supabase
      .channel(`game-${gameRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameRoom.id}`,
        },
        () => {
          loadGame(gameRoom.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `game_id=eq.${gameRoom.id}`,
        },
        () => {
          loadGame(gameRoom.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameRoom, loadGame]);

  return {
    gameRoom,
    user,
    loading,
    connectWallet,
    disconnectWallet,
    createGame,
    joinGame,
    startGame,
    submitAnswer,
    nextQuestion,
    completeGame,
    resetGame,
    loadGame,
  };
};