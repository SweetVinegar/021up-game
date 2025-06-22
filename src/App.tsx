import React from 'react';
import { Gamepad2, Sparkles } from 'lucide-react';
import { WalletConnection } from './components/WalletConnection';
import { GameSetup } from './components/GameSetup';
import { GameLobby } from './components/GameLobby';
import { GamePlay } from './components/GamePlay';
import { GameResults } from './components/GameResults';
import { GameDashboard } from './components/GameDashboard';
import { useGameState } from './hooks/useGameState';
import { GameRoom } from './types';

import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

function Home() {
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
  const [createdGameId, setCreatedGameId] = React.useState<string | null>(null);

  const handleCreateGame = async (gameData: Partial<GameRoom>) => {
    const id = await createGame(gameData);
    if (id && typeof id === 'string' && id.startsWith('local-')) {
      // For local games, navigate directly to the game page
      window.location.href = `/game/${id}`;
      return undefined; // Indicate that we've handled the navigation
    }
    setCreatedGameId(id === undefined ? null : id);
    return id;
  };

  // 自動推進問題
  React.useEffect(() => {
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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

  const Header = () => (
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
            className={`text-white ${currentView === 'game' ? 'border-b-2 border-purple-400' : 'text-white/70 hover:text-white transition-colors'}`}
          >
            遊戲
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`text-white ${currentView === 'dashboard' ? 'border-b-2 border-purple-400' : 'text-white/70 hover:text-white transition-colors'}`}
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
  );

  if (!gameRoom && currentView === 'game') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Header />
        {createdGameId ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
            <h2 className="text-4xl font-bold text-white mb-6">遊戲已創建！</h2>
            <p className="text-xl text-white/80 mb-8">將此房間號分享給你的朋友：</p>
            <div className="bg-white/10 rounded-lg p-4 mb-8 flex items-center justify-between w-full max-w-md">
              <span className="text-3xl font-mono text-green-400 tracking-wider">{createdGameId}</span>
              <button
                onClick={() => navigator.clipboard.writeText(createdGameId)}
                className="ml-4 p-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy text-white"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
            <button
              onClick={() => setCreatedGameId(null)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-lg font-semibold"
            >
              創建新遊戲
            </button>
          </div>
        ) : (
          <GameSetup
            onCreateGame={handleCreateGame}
            userBalance={user.balance || 0} // Assuming user.balance exists, default to 0 if not
          />
        )}
      </div>
    );
  }

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
      <Header />
      {currentView === 'game' && gameRoom && (
        <>
          {gameRoom && gameRoom.status === 'waiting' && user && (
            <GameLobby
              gameRoom={gameRoom}
              userAddress={user.address}
              onJoinGame={(gameId: string, participantAddress: string, participantName: string) => joinGame(gameId, participantAddress, participantName)}
              onStartGame={() => startGame(gameRoom.id)}
              isOrganizer={gameRoom.organizerAddress === user.address}
            />
          )}
          {gameRoom && gameRoom.status === 'active' && user && (
            <GamePlay
              gameRoom={gameRoom}
              userAddress={user.address}
              onSubmitAnswer={submitAnswer}
              onGameComplete={completeGame}
            />
          )}
          {gameRoom && gameRoom.status === 'completed' && user && (
            <GameResults
              gameRoom={gameRoom}
              userAddress={user.address}
              onResetGame={resetGame}
            />
          )}
        </>
      )}
      {currentView === 'dashboard' && (
        <GameDashboard userAddress={user.address} />
      )}
    </div>
  );
}



export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const {
    gameRoom,
    user,
    loading,
    loadGame,
    joinGame,
    startGame,
    submitAnswer,
    nextQuestion,
    completeGame,
    resetGame,
    connectWallet,
    disconnectWallet
  } = useGameState();

  React.useEffect(() => {
    if (gameId) {
      loadGame(gameId);
    }
  }, [gameId, loadGame]);

  React.useEffect(() => {
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">載入中...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
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
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>遊戲不存在或載入失敗。</p>
      </div>
    );
  }

  const GameHeader = ({ title }: { title: string }) => (
    <header className="p-6 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>
      <WalletConnection
        user={user}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
      />
    </header>
  );

  const isOrganizer = gameRoom.organizer === user.address;

  switch (gameRoom.status) {
    case 'waiting':
      return (
      <div className="min-h-screen bg-gray-900">
          <GameHeader title="QuizChain" />
          <GameLobby
            gameRoom={gameRoom}
            isOrganizer={isOrganizer}
            onStartGame={() => startGame(gameRoom.id)}
            onJoinGame={() => joinGame(gameId as string, user.address, user.name)}
            userAddress={user.address}
          />
        </div>
      );

      case 'active':
        return (
          <div className="min-h-screen">
            <GameHeader title={gameRoom.name} />
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
            <GameHeader title="QuizChain" />
            <GameResults
              gameRoom={gameRoom}
              userAddress={user.address}
              onResetGame={resetGame}
            />
          </div>
        );

    default:
      return (
        <div className="min-h-screen flex items-center justify-center text-white">
          <p>未知遊戲狀態。</p>
        </div>
      );
  }
}