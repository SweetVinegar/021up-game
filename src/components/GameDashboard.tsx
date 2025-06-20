import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, Coins, TrendingUp, Activity } from 'lucide-react';
import { gameService } from '../services/gameService';

interface GameDashboardProps {
  userAddress: string;
}

export const GameDashboard: React.FC<GameDashboardProps> = ({ userAddress }) => {
  const [organizerGames, setOrganizerGames] = useState<any[]>([]);
  const [participantGames, setParticipantGames] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalGamesOrganized: 0,
    totalGamesParticipated: 0,
    totalTokensEarned: 0,
    totalTokensStaked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [userAddress]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 載入組織的遊戲
      const organizedGames = await gameService.getGamesByOrganizer(userAddress);
      setOrganizerGames(organizedGames);

      // 載入參與的遊戲
      const participatedGames = await gameService.getParticipantGames(userAddress);
      setParticipantGames(participatedGames);

      // 計算統計資料
      const totalTokensStaked = organizedGames.reduce((sum, game) => sum + game.total_staked, 0);
      const totalTokensEarned = participatedGames.reduce((sum, p) => sum + p.tokens_earned, 0);

      setStats({
        totalGamesOrganized: organizedGames.length,
        totalGamesParticipated: participatedGames.length,
        totalTokensEarned,
        totalTokensStaked,
      });

    } catch (error) {
      console.error('載入儀表板資料失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded mb-6"></div>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white/10 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-8">遊戲儀表板</h1>

      {/* 統計卡片 */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold">組織遊戲</h3>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalGamesOrganized}</p>
          <p className="text-white/60 text-sm">總共組織的遊戲數</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold">參與遊戲</h3>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalGamesParticipated}</p>
          <p className="text-white/60 text-sm">總共參與的遊戲數</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white font-semibold">獲得代幣</h3>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalTokensEarned}</p>
          <p className="text-white/60 text-sm">QUIZ 代幣總收益</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Coins className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-white font-semibold">質押代幣</h3>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalTokensStaked}</p>
          <p className="text-white/60 text-sm">QUIZ 代幣總質押</p>
        </div>
      </div>

      {/* 組織的遊戲 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">我組織的遊戲</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizerGames.map((game) => (
            <div key={game.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">{game.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  game.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                  game.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {game.status === 'waiting' ? '等待中' : 
                   game.status === 'active' ? '進行中' : '已完成'}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>質押代幣:</span>
                  <span className="text-white">{game.total_staked} {game.token_symbol}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>創建時間:</span>
                  <span className="text-white">
                    {new Date(game.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 參與的遊戲 */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">我參與的遊戲</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {participantGames.map((participant) => (
            <div key={participant.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">{participant.games.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  participant.games.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                  participant.games.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {participant.games.status === 'waiting' ? '等待中' : 
                   participant.games.status === 'active' ? '進行中' : '已完成'}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>我的分數:</span>
                  <span className="text-white font-semibold">{participant.score}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>獲得代幣:</span>
                  <span className="text-green-400 font-semibold">
                    {participant.tokens_earned} {participant.games.token_symbol}
                  </span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>加入時間:</span>
                  <span className="text-white">
                    {new Date(participant.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};