import { useState, useCallback, useEffect } from 'react';
import { GameRoom, Participant, Answer, User } from '../types';
import { gameService } from '../services/gameService';
import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';
import { QUIZ_TOKEN_ABI } from '../lib/blockchain';


export const useGameState = () => {
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const connectWallet = useCallback(async (displayName?: string) => {
    try {
      setLoading(true);
      console.log('正在嘗試連接錢包...');
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
      console.log('成功切換到 Sepolia 測試網。');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = (await signer.getAddress()).toLowerCase();
      console.log('已獲取錢包地址:', address);
      const quizTokenContract = new ethers.Contract(
        '0xb24307c8a40a0dc5609674456b58148d65fbf50c', // QUIZ Token address
        QUIZ_TOKEN_ABI, // QUIZ Token ABI
        provider
      );
      const quizBalance = await quizTokenContract.balanceOf(address);
      const formattedQuizBalance = parseFloat(ethers.formatEther(quizBalance));

      // Use a static message for signing to ensure a consistent password
      const message = `Welcome to 021up-game! Sign this message to authenticate your wallet: ${address}`;
      const signature = await signer.signMessage(message);
      const password = ethers.keccak256(ethers.toUtf8Bytes(signature));

      // Try to sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${address}@021up.game`,
        password: password,
      });

      let sessionUser = authData.user;

      // If user does not exist or invalid credentials, try to sign them up
      if (authError && (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found'))) {
        console.log('用戶不存在或憑證無效，嘗試註冊...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: `${address}@021up.game`,
          password: password,
          options: {
            data: {
              wallet_address: address,
              name: displayName || `Player_${address.slice(2, 6)}`,
            },
          },
        });

        if (signUpError) {
          // If sign-up fails because user already exists (race condition), try signing in again.
          if (signUpError.message.includes('User already registered')) {
            console.log('用戶已註冊，嘗試重新登入...');
            const { data: retryAuthData, error: retryAuthError } = await supabase.auth.signInWithPassword({
              email: `${address}@021up.game`,
              password: password,
            });
            if (retryAuthError) throw new Error(`登入重試失敗: ${retryAuthError.message}`);
            sessionUser = retryAuthData.user;
          } else {
            throw new Error(`註冊失敗: ${signUpError.message}`);
          }
        } else {
          sessionUser = signUpData.user;
        }
      } else if (authError) {
        throw new Error(`登入失敗: ${authError.message}`);
      }

      // Ensure wallet_address is in user_metadata
      if (sessionUser && (!sessionUser.user_metadata || sessionUser.user_metadata.wallet_address !== address)) {
        console.log('更新用戶元數據中的錢包地址...');
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          data: {
            wallet_address: address,
            name: sessionUser.user_metadata?.name || displayName || `Player_${address.slice(2, 6)}`,
          },
        });
        if (updateError) {
          console.warn('更新用戶元數據失敗:', updateError.message);
        } else if (updateData.user) {
          sessionUser = updateData.user;
        }
      }

      if (!sessionUser) {
        throw new Error('無法獲取用戶會話。');
      }

      // 强制刷新会话，确保 JWT 包含最新的 user_metadata
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.getSession();
      if (refreshError) {
        console.warn('刷新会话失败:', refreshError.message);
      } else if (refreshedSession && refreshedSession.user) {
        sessionUser = refreshedSession.user;
      }

      setUser({
        address: address,
        name: sessionUser.user_metadata.name || displayName || `Player_${address.slice(2, 6)}`,
        balance: formattedQuizBalance,
      });
    } catch (error: any) {
      console.error('連接錢包失敗:', error);
      alert(`連接錢包失敗: ${error.message || error.toString()}。請檢查您的錢包設置和控制台。`);
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

  const loadGame = useCallback(async (gameId: string) => {
    setLoading(true);
    try {
      // 检查是否为本地游戏
      if (gameId.startsWith('local-')) {
        // 对于本地游戏，尝试从 localStorage 加载
        const localGameData = localStorage.getItem(`local-game-${gameId}`);
        if (localGameData) {
          try {
            const parsedGame: GameRoom = JSON.parse(localGameData);
            setGameRoom(parsedGame);
            setLoading(false);
            return;
          } catch (parseError) {
            console.error("解析本地遊戲數據失敗:", parseError);
            alert("加載本地遊戲數據失敗，數據可能已損壞。");
            setGameRoom(null); // Clear game room if data is corrupted
            setLoading(false);
            return;
          }
        } else {
          // 如果 localStorage 中沒有，則模擬一個空的本地遊戲
          console.warn(`本地遊戲 ${gameId} 在 localStorage 中未找到，將創建一個模擬遊戲。`);
          const localGameRoom: GameRoom = {
            id: gameId,
            name: "Local Game",
            organizer: user?.address || "",
            organizerAddress: user?.address || "",
            questions: [], // 本地遊戲的問題需要從其他地方加載或生成
            tokenReward: 0,
            tokenSymbol: "",
            status: 'waiting',
            participants: [],
            currentQuestionIndex: 0,
          };
          setGameRoom(localGameRoom);
          setLoading(false);
          return;
        }
      }

      const room = await gameService.getGame(gameId);
      if (room) {
        const gameRoom: GameRoom = {
          id: room.id,
          name: room.name,
          organizer: room.organizer_address,
          organizerAddress: room.organizer_address,
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
            answers: p.answers ? p.answers.map((a: any) => ({
              questionId: a.question_id,
              selectedOption: a.selected_option,
              timeToAnswer: a.time_to_answer,
              isCorrect: a.is_correct,
            })) : [],
            tokensEarned: p.tokens_earned,
          })),
          currentQuestionIndex: room.current_question_index,
          startTime: room.start_time ? new Date(room.start_time).getTime() : undefined,
        };
        setGameRoom(gameRoom);
        // 自动加入游戏作为参与者
        if (user && !gameRoom.participants.some(p => p.address === user.address)) {
          await joinGame(gameId, user.address, user.name);
        }
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
  }, [user]);

  const createGame = async (gameData: Partial<GameRoom>): Promise<string | undefined> => {
    if (!user?.address) return undefined;

    // Check if this is a local game (identified by the presence of 'id' starting with 'local-')
    if (gameData.id && gameData.id.startsWith('local-')) {
      const localGame: GameRoom = {
        id: gameData.id,
        name: gameData.name || 'Local Game',
        organizer: user.address,
        organizerAddress: user.address,
        questions: gameData.questions || [],
        tokenReward: gameData.tokenReward || 0,
        tokenSymbol: gameData.tokenSymbol || 'QUIZ',
        status: 'waiting',
        participants: [],
        currentQuestionIndex: 0,
      };

      localStorage.setItem(`local-game-${gameData.id}`, JSON.stringify(localGame));
      setGameRoom(localGame); // Update the gameRoom state with the newly created local game
      return gameData.id;
    }

    try {
      const { data: game, error } = await supabase
        .from('games')
        .insert([
          {
            name: gameData.name,
            organizer: user.address,
            organizer_address: user.address,
            token_reward: gameData.tokenReward,
            token_symbol: gameData.tokenSymbol,
            status: 'waiting',
          },
        ])
        .select('id')
        .single();

      if (error) throw error;

      // Insert questions
      if (gameData.questions && gameData.questions.length > 0) {
        const questionsToInsert = gameData.questions.map((q) => ({
          game_id: game.id,
          question: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          time_limit: q.timeLimit,
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      return game.id;
    } catch (error) {
      console.error('Error creating game:', error);
      return undefined;
    }
  };

  const joinGame = useCallback(async (gameId: string, participantAddress: string, participantName: string) => {
    if (!gameRoom || !user) return;

    try {
      setLoading(true);
      
      // 檢查是否為本地遊戲
      if (gameId.startsWith('local-')) {
        const newParticipant: Participant = {
          id: `participant-${Date.now()}`,
          address: participantAddress,
          name: participantName,
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
      
      await gameService.joinGame(gameId, {
        walletAddress: participantAddress,
        name: participantName,
      });

      // 重新載入遊戲資料
      await loadGame(gameId);
      
    } catch (error) {
      console.error('加入遊戲失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [user, loadGame]);

  const startGame = async (gameId: string) => {
    if (!user?.address || !gameRoom || gameRoom.id !== gameId) return;

    // Handle local game start
    if (gameId.startsWith('local-')) {
      const updatedGameRoom = { ...gameRoom, status: 'active' as const };
      localStorage.setItem(`local-game-${gameId}`, JSON.stringify(updatedGameRoom));
      setGameRoom(updatedGameRoom);
      return;
    }

    try {
      const { error } = await supabase
        .from('games')
        .update({ status: 'active' })
        .eq('id', gameId);

      if (error) throw error;

      setGameRoom((prev) => (prev ? { ...prev, status: 'active' } : null));
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

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
  }, [user, loadGame]);

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
    loadGame,
    createGame,
    joinGame,
    startGame,
    submitAnswer,
    nextQuestion,
    completeGame,
    resetGame,
  };
};