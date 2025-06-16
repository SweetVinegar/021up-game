import React from 'react';
import { Trophy, Coins, Medal, Users } from 'lucide-react';
import { GameRoom } from '../types';

interface GameResultsProps {
  gameRoom: GameRoom;
  onNewGame: () => void;
}

export const GameResults: React.FC<GameResultsProps> = ({ gameRoom, onNewGame }) => {
  const sortedParticipants = [...gameRoom.participants].sort((a, b) => b.score - a.score);
  const totalTokensDistributed = gameRoom.participants.reduce((sum, p) => sum + p.tokensEarned, 0);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-orange-400" />;
      default:
        return <Users className="w-6 h-6 text-purple-400" />;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30';
      case 1:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 2:
        return 'bg-gradient-to-r from-orange-400/20 to-red-500/20 border-orange-400/30';
      default:
        return 'bg-white/5 border-white/20';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎉 Game Complete!</h1>
          <p className="text-white/70 text-lg">{gameRoom.name}</p>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold mb-1">Total Players</h3>
            <p className="text-2xl font-bold text-purple-400">{gameRoom.participants.length}</p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold mb-1">Questions</h3>
            <p className="text-2xl font-bold text-blue-400">{gameRoom.questions.length}</p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Coins className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-white font-semibold mb-1">Tokens Distributed</h3>
            <p className="text-2xl font-bold text-green-400">{totalTokensDistributed} QUIZ</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/5 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">🏆 Final Leaderboard</h2>
          
          <div className="space-y-4">
            {sortedParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className={`rounded-xl p-6 border transition-all duration-300 ${getRankBg(index)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {getRankIcon(index)}
                      <span className="text-white/80 font-bold text-lg">#{index + 1}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-500/30' :
                        index === 1 ? 'bg-gray-400/30' :
                        index === 2 ? 'bg-orange-500/30' :
                        'bg-purple-500/30'
                      }`}>
                        <span className="text-white font-bold text-lg">
                          {participant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">{participant.name}</p>
                        <p className="text-white/60 text-sm">
                          {participant.address.slice(0, 8)}...{participant.address.slice(-6)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{participant.score} pts</p>
                    <div className="flex items-center gap-1 justify-end">
                      <Coins className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-semibold">
                        {participant.tokensEarned} QUIZ
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Performance Details */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-white/60 text-sm">Correct</p>
                      <p className="text-white font-semibold">
                        {participant.answers.filter(a => a.isCorrect).length}/{participant.answers.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Accuracy</p>
                      <p className="text-white font-semibold">
                        {participant.answers.length > 0 
                          ? Math.round((participant.answers.filter(a => a.isCorrect).length / participant.answers.length) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Avg Time</p>
                      <p className="text-white font-semibold">
                        {participant.answers.length > 0
                          ? (participant.answers.reduce((sum, a) => sum + a.timeToAnswer, 0) / participant.answers.length / 1000).toFixed(1)
                          : 0}s
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={onNewGame}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
          >
            Create New Game
          </button>
        </div>
      </div>
    </div>
  );
};