import { useState, useCallback, useEffect } from 'react';
import { GameRoom, Participant, Answer, User } from '../types';
import { gameService } from '../services/gameService';
import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';
import { QUIZ_TOKEN_ABI, blockchainService } from '../lib/blockchain';

export const useGameState = () => {
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      // 實際錢包連接邏輯
      if (!window.ethereum) {
        alert('請安裝 MetaMask 或其他兼容的以太坊錢包！');
        return;
      }

      // 切换到 Sepolia 测试网
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // Sepolia 的 chainId
        });
      } catch (switchError: any) {
        console.error("切換網路失敗: 根據錯誤碼判斷，可能是用戶拒絕了切換，或者需要用戶在 MetaMask 中手動添加 Sepolia 測試網。", switchError);
        if (switchError.code === 4902) {
          alert("請在 MetaMask 中添加 Sepolia 測試網。");
        } else if (switchError.code === 4001) {
          alert("您已拒絕切換網路。");
        } else {
          alert("無法切換到 Sepolia 測試網，請手動切換。");
        }
        throw switchError; // 重新拋出錯誤，讓上層捕獲並處理
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const quizTokenContract = new ethers.Contract(
        '0xb24307c8a40a0dc5609674456b58148d65fbf50c', // QUIZ Token address
        QUIZ_TOKEN_ABI, // QUIZ Token ABI
        provider
      );
      const quizBalance = await quizTokenContract.balanceOf(address);
      const formattedQuizBalance = parseFloat(ethers.formatEther(quizBalance));

      // 嘗試從 Supabase 獲取用戶資料
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('wallet_address', address)
        .single();

      let displayName = userData?.display_name || '匿名用戶';

      // 如果用戶不存在於 Supabase，則創建一個新用戶
      if (userError && userError.code === 'PGRST116') { // 116 表示沒有找到行
        const { error: signUpError } = await supabase.auth.signUp({
          email: `${address.slice(2, 10)}@wallet.local`, // 使用地址作為唯一郵箱
          password: address, // 僅用於演示，實際應用中應使用更安全的認證方式
          options: {
            data: {
              wallet_address: address,
              display_name: displayName,
            }
          }
        });

        if (signUpError) {
          console.error('Supabase 註冊失敗:', signUpError);
          throw signUpError;
        }
      }

      setUser({
        address: address,
        name: displayName,
        balance: formattedQuizBalance,
      });
    } catch (error) {
      console.error('連接錢包失敗:', error);
      alert('連接錢包失敗，請檢查您的錢包設置。');
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

  const fetchGameRoom = useCallback(async (gameId: string) => {
    setLoading(true);
    try {
      // 首先尝试从 Supabase 获取完整的游戏数据
      const room = await gameService.getGame(gameId);
      if (room) {
        // 转换数据库格式为前端格式
        const gameRoom: GameRoom = {
          id: room.id,
          name: room.name,
          organizer: room.organizer_address,
          questions: room.questions.map((q: any) => ({
            id: q.id,
            question: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            timeLimit: q.time_limit,
          })),
          tokenReward: room.token_reward_per_question,
          tokenSymbol: room.token_symbol,
          status: room.status,
          participants: room.participants.map((p: any) => ({
            id: p.id,
            address: p.wallet_address,
            name: p.name,
            score: p.score,
            answers: [], // 稍後載入
            tokensEarned: p.tokens_earned,
          })),
          currentQuestionIndex: room.current_question_index,
          startTime: room.start_time ? new Date(room.start_time).getTime() : undefined,
        };
        setGameRoom(gameRoom);
      } else {
        alert("遊戲房間不存在。");
        setGameRoom(null);
      }
    } catch (error) {
      console.error("獲取遊戲房間失敗: ", error);
      alert("獲取遊戲房間失敗，請檢查控制台。");
      setGameRoom(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createGame = useCallback(async (gameData: Partial<GameRoom>) => {
    if (!user) return;

    let provider: ethers.BrowserProvider;
    let signer: ethers.Signer;
    let address: string;

    try {
      if (!window.ethereum) {
        alert('請安裝 MetaMask 或其他兼容的以太坊錢包！');
        return;
      }
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      address = await signer.getAddress();
    } catch (error) {
      console.error('獲取錢包信息失敗:', error);
      alert('無法獲取錢包信息，請確保錢包已連接。');
      return;
    }

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
        questions: gameData.questions?.map((q) => ({
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
      
      // 實際質押代幣
      const totalStaked = (gameData.tokenReward || 0) * (gameData.questions?.length || 0);

      try {
        // 使用 blockchainService 進行代幣批准和遊戲創建
        await blockchainService.createGame(
          '0xb24307c8a40a0dc5609674456b58148d65fbf50c', // QUIZ Token address
          totalStaked.toString(),
          gameData.questions?.length || 0,
          0, // category (placeholder)
          0  // difficulty (placeholder)
        );
        
        // 更新用戶餘額
        const newBalance = await blockchainService.getTokenBalance(address);
        setUser(prev => prev ? { 
          ...prev, 
          balance: parseFloat(newBalance) 
        } : null);
      } catch (error) {
        console.error('質押代幣失敗:', error);
        throw new Error('質押代幣失敗，請確保餘額充足');
      }
      
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
    fetchGameRoom,
  };
};