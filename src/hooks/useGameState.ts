import { useState, useCallback } from 'react';
import { GameRoom, Question, Participant, Answer, User } from '../types';

export const useGameState = () => {
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const connectWallet = useCallback(() => {
    // Simulate wallet connection
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
  }, []);

  const disconnectWallet = useCallback(() => {
    setUser(null);
    setGameRoom(null);
  }, []);

  const createGame = useCallback((gameData: Partial<GameRoom>) => {
    if (!user) return;

    const newGame: GameRoom = {
      id: Date.now().toString(),
      name: gameData.name || '',
      organizer: user.address,
      questions: gameData.questions || [],
      tokenReward: gameData.tokenReward || 0,
      tokenSymbol: gameData.tokenSymbol || 'QUIZ',
      status: 'waiting',
      participants: [],
      currentQuestionIndex: 0,
    };

    setGameRoom(newGame);
    
    // Deduct staked tokens from user balance
    const totalStaked = newGame.tokenReward * newGame.questions.length;
    setUser(prev => prev ? { ...prev, balance: prev.balance - totalStaked } : null);
  }, [user]);

  const joinGame = useCallback((playerName: string) => {
    if (!gameRoom || !user) return;

    const newParticipant: Participant = {
      id: Date.now().toString(),
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
  }, [gameRoom, user]);

  const startGame = useCallback(() => {
    if (!gameRoom) return;

    setGameRoom(prev => prev ? {
      ...prev,
      status: 'active',
      startTime: Date.now(),
    } : null);
  }, [gameRoom]);

  const submitAnswer = useCallback((answer: Answer) => {
    if (!gameRoom || !user) return;

    setGameRoom(prev => {
      if (!prev) return null;

      const updatedParticipants = prev.participants.map(participant => {
        if (participant.address === user.address) {
          const updatedAnswers = [...participant.answers, answer];
          let newScore = participant.score;
          let tokensEarned = participant.tokensEarned;

          if (answer.isCorrect) {
            // Score based on correctness and speed
            const speedBonus = Math.max(0, 1000 - answer.timeToAnswer);
            newScore += 1000 + Math.floor(speedBonus / 10);
            tokensEarned += prev.tokenReward;
          }

          return {
            ...participant,
            answers: updatedAnswers,
            score: newScore,
            tokensEarned,
          };
        }
        return participant;
      });

      return {
        ...prev,
        participants: updatedParticipants,
      };
    });
  }, [gameRoom, user]);

  const nextQuestion = useCallback(() => {
    if (!gameRoom) return;

    setGameRoom(prev => {
      if (!prev) return null;

      const nextIndex = prev.currentQuestionIndex + 1;
      
      if (nextIndex >= prev.questions.length) {
        // Game complete
        return {
          ...prev,
          status: 'completed',
        };
      }

      return {
        ...prev,
        currentQuestionIndex: nextIndex,
      };
    });
  }, [gameRoom]);

  const completeGame = useCallback(() => {
    if (!gameRoom) return;

    setGameRoom(prev => {
      if (!prev) return null;

      // Distribute tokens to user balance
      const participant = prev.participants.find(p => p.address === user?.address);
      if (participant && participant.tokensEarned > 0) {
        setUser(prevUser => prevUser ? {
          ...prevUser,
          balance: prevUser.balance + participant.tokensEarned,
        } : null);
      }

      return {
        ...prev,
        status: 'completed',
      };
    });
  }, [gameRoom, user]);

  const resetGame = useCallback(() => {
    setGameRoom(null);
  }, []);

  return {
    gameRoom,
    user,
    connectWallet,
    disconnectWallet,
    createGame,
    joinGame,
    startGame,
    submitAnswer,
    nextQuestion,
    completeGame,
    resetGame,
  };
};