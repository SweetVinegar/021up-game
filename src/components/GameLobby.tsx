import React from 'react';
import { Users, Play, Clock, Coins } from 'lucide-react';
import { GameRoom } from '../types';

interface GameLobbyProps {
  gameRoom: GameRoom;
  isOrganizer: boolean;
  onStartGame: () => void;
  onJoinGame: (gameId: string, participantAddress: string, participantName: string) => Promise<void>;
  userAddress: string;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  gameRoom,
  isOrganizer,
  onStartGame,
  onJoinGame,
  userAddress,
}) => {
  const [playerName, setPlayerName] = React.useState('');
  const isParticipant = gameRoom.participants.some(p => p.address === userAddress);

  const handleJoin = () => {
    if (playerName.trim()) {
      onJoinGame(gameRoom.id, userAddress, playerName.trim());
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{gameRoom.name}</h1>
          <p className="text-white/70">Waiting for players to join...</p>
        </div>

        {/* Game Info */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold mb-1">Players</h3>
            <p className="text-2xl font-bold text-purple-400">{gameRoom.participants.length}</p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold mb-1">Questions</h3>
            <p className="text-2xl font-bold text-blue-400">{gameRoom.questions.length}</p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Coins className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-white font-semibold mb-1">Total Prize</h3>
            <p className="text-2xl font-bold text-green-400">
              {gameRoom.tokenReward * gameRoom.questions.length} {gameRoom.tokenSymbol}
            </p>
          </div>
        </div>

        {/* Join Game or Player List */}
        {!isParticipant && !isOrganizer ? (
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Join the Game</h3>
            <div className="max-w-md mx-auto flex gap-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your name"
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              />
              <button
                onClick={handleJoin}
                disabled={!playerName.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Players ({gameRoom.participants.length})</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameRoom.participants.map((participant, index) => (
                <div key={participant.id} className="bg-white/5 rounded-lg p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    index === 1 ? 'bg-gray-400/20 text-gray-300' :
                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    <span className="font-bold">{participant.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{participant.name}</p>
                    <p className="text-white/60 text-sm">
                      {participant.address.slice(0, 6)}...{participant.address.slice(-4)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start Game Button (Organizer Only) */}
        {isOrganizer && (
          <div className="text-center">
            <button
              onClick={onStartGame}
              disabled={gameRoom.participants.length === 0}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-full flex items-center gap-3 mx-auto transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
            >
              <Play className="w-5 h-5" />
              Start Game
            </button>
            {gameRoom.participants.length === 0 && (
              <p className="text-white/60 text-sm mt-2">Need at least 1 player to start</p>
            )}
          </div>
        )}

        {isParticipant && !isOrganizer && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              You're in! Waiting for organizer to start...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};