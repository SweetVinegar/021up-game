import React from 'react';
import { Wallet, LogOut } from 'lucide-react';

interface WalletConnectionProps {
  user: { address: string; name: string; balance: number } | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  user,
  onConnect,
  onDisconnect,
}) => {
  return (
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-white">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs opacity-70">
              {user.address.slice(0, 6)}...{user.address.slice(-4)}
            </p>
          </div>
          <span className="text-white bg-white/20 px-2 py-1 rounded-full text-xs">
            {user.balance} QUIZ
          </span>
          <button
            onClick={onDisconnect}
            className="text-white/70 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 transform hover:scale-105"
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
      )}
    </div>
  );
};