import React, { useEffect } from 'react';
import { Gamepad2, Sparkles, BarChart3 } from 'lucide-react';
import { WalletConnection } from './components/WalletConnection';
import { GameSetup } from './components/GameSetup';
import { GameLobby } from './components/GameLobby';
import { GamePlay } from './components/GamePlay';
import { GameResults } from './components/GameResults';
import { GameDashboard } from './components/GameDashboard';
import { useGameState } from './hooks/useGameState';

function App() {
  const {
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
  } = useGameState();

  const [currentView, setCurrentView] = React.useState<'game' | 'dashboard'>('game');

  // 自動推進問題
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
                參與問答遊戲並獲得加密貨幣獎勵！創建問題、質押代幣，讓最聰明的玩家獲勝。
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">創建遊戲</h3>
                <p className="text-white/60 text-sm">設定問答題目並質押代幣作為獎品</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gamepad2 className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">遊玩獲勝</h3>
                <p className="text-white/60 text-sm">快速正確回答問題以獲得代幣</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 bg-green-400 rounded-full"></div>
                </div>
                <h3 className="text-white font-semibold mb-2">自動獎勵</h3>
                <p className="text-white/60 text-sm">智能合約自動分配獎品</p>
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

    if (currentView === 'dashboard') {
      return (
        <div className="min-h-screen">
          <header className="p-6 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">QuizChain</h1>
              </div>
              
              <nav className="flex gap-4">
                <button
                  onClick={() => setCurrentView('game')}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  遊戲
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-white border-b-2 border-purple-400"
                >
                  儀表板
                </button>
              </nav>
            </div>
            <WalletConnection
              user={user}
              onConnect={connectWallet}
              onDisconnect={disconnectWallet}
            />
          </header>
          <GameDashboard userAddress={user.address} />
        </div>
      );
    }

    if (!gameRoom) {
      return (
        <div className="min-h-screen">
          <header className="p-6 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">QuizChain</h1>
              </div>
              
              <nav className="flex gap-4">
                <button
                  onClick={() => setCurrentView('game')}
                  className="text-white border-b-2 border-purple-400"
                >
                  遊戲
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  儀表板
                </button>
              </nav>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {renderCurrentView()}
    </div>
  );
}

export default App;