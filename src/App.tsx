import React, { useEffect } from 'react';
import { Gamepad2, Sparkles } from 'lucide-react';
import { WalletConnection } from './components/WalletConnection';
import { GameSetup } from './components/GameSetup';
import { GameLobby } from './components/GameLobby';
import { GamePlay } from './components/GamePlay';
import { GameResults } from './components/GameResults';
import { useGameState } from './hooks/useGameState';

function App() {
  const {
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
  } = useGameState();

  // Auto-advance questions during gameplay
  useEffect(() => {
    if (gameRoom?.status === 'active' && gameRoom.participants.length > 0) {
      const allAnswered = gameRoom.participants.every(
        p => p.answers.length > gameRoom.currentQuestionIndex
      );
      
      if (allAnswered) {
        const timer = setTimeout(() => {
          if (gameRoom.currentQuestionIndex < gameRoom.questions.length - 1) {
            nextQuestion();
          } else {
            completeGame();
          }
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [gameRoom, nextQuestion, completeGame]);

  const renderCurrentView = () => {
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-2xl">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-6">
                <Gamepad2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white mb-4">
                Quiz<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Chain</span>
              </h1>
              <p className="text-xl text-white/70 mb-8">
                Compete in trivia games and earn crypto rewards! Create questions, stake tokens, and let the smartest players win.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Create Games</h3>
                <p className="text-white/60 text-sm">Set up trivia questions and stake tokens as prizes</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gamepad2 className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Play & Win</h3>
                <p className="text-white/60 text-sm">Answer questions quickly and correctly to earn tokens</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 bg-green-400 rounded-full"></div>
                </div>
                <h3 className="text-white font-semibold mb-2">Auto Rewards</h3>
                <p className="text-white/60 text-sm">Smart contracts automatically distribute prizes</p>
              </div>
            </div>
            
            <WalletConnection
              user={user}
              onConnect={connectWallet}
              onDisconnect={disconnectWallet}
            />
          </div>
        </div>
      );
    }

    if (!gameRoom) {
      return (
        <div className="min-h-screen">
          <header className="p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">QuizChain</h1>
            </div>
            <WalletConnection
              user={user}
              onConnect={connectWallet}
              onDisconnect={disconnectWallet}
            />
          </header>
          <GameSetup onCreateGame={createGame} userBalance={user.balance} />
        </div>
      );
    }

    const isOrganizer = gameRoom.organizer === user.address;

    switch (gameRoom.status) {
      case 'waiting':
        return (
          <div className="min-h-screen">
            <header className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">QuizChain</h1>
              </div>
              <WalletConnection
                user={user}
                onConnect={connectWallet}
                onDisconnect={disconnectWallet}
              />
            </header>
            <GameLobby
              gameRoom={gameRoom}
              isOrganizer={isOrganizer}
              onStartGame={startGame}
              onJoinGame={joinGame}
              userAddress={user.address}
            />
          </div>
        );

      case 'active':
        return (
          <div className="min-h-screen">
            <header className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">{gameRoom.name}</h1>
              </div>
              <WalletConnection
                user={user}
                onConnect={connectWallet}
                onDisconnect={disconnectWallet}
              />
            </header>
            <GamePlay
              gameRoom={gameRoom}
              onSubmitAnswer={submitAnswer}
              userAddress={user.address}
              onGameComplete={completeGame}
            />
          </div>
        );

      case 'completed':
        return (
          <div className="min-h-screen">
            <header className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">QuizChain</h1>
              </div>
              <WalletConnection
                user={user}
                onConnect={connectWallet}
                onDisconnect={disconnectWallet}
              />
            </header>
            <GameResults gameRoom={gameRoom} onNewGame={resetGame} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {renderCurrentView()}
    </div>
  );
}

export default App;