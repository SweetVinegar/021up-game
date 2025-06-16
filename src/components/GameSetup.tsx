import React, { useState } from 'react';
import { Plus, Trash2, Play, Coins } from 'lucide-react';
import { Question, GameRoom } from '../types';

interface GameSetupProps {
  onCreateGame: (gameData: Partial<GameRoom>) => void;
  userBalance: number;
}

export const GameSetup: React.FC<GameSetupProps> = ({ onCreateGame, userBalance }) => {
  const [gameName, setGameName] = useState('');
  const [tokenReward, setTokenReward] = useState(100);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    timeLimit: 30,
  });

  const addQuestion = () => {
    if (currentQuestion.question && currentQuestion.options.every(opt => opt.trim())) {
      const newQuestion: Question = {
        id: Date.now().toString(),
        ...currentQuestion,
      };
      setQuestions([...questions, newQuestion]);
      setCurrentQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        timeLimit: 30,
      });
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const createGame = () => {
    if (gameName && questions.length > 0 && tokenReward <= userBalance) {
      onCreateGame({
        name: gameName,
        questions,
        tokenReward,
        tokenSymbol: 'QUIZ',
      });
    }
  };

  const totalTokens = tokenReward * questions.length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Create New Game</h2>
        
        {/* Game Basic Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Game Name</label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter game name"
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Token Reward per Question
            </label>
            <div className="relative">
              <input
                type="number"
                value={tokenReward}
                onChange={(e) => setTokenReward(Number(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 pr-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="100"
              />
              <span className="absolute right-3 top-3 text-white/60">QUIZ</span>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Total: {totalTokens} QUIZ (Balance: {userBalance})
            </p>
          </div>
        </div>

        {/* Question Creation */}
        <div className="bg-white/5 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Add Question</h3>
          
          <div className="mb-4">
            <input
              type="text"
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your question"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="relative">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className={`w-full bg-white/10 border rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    currentQuestion.correctAnswer === index
                      ? 'border-green-400 bg-green-500/20'
                      : 'border-white/20'
                  }`}
                  placeholder={`Option ${index + 1}`}
                />
                <button
                  onClick={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                  className={`absolute right-2 top-2 w-6 h-6 rounded-full border-2 ${
                    currentQuestion.correctAnswer === index
                      ? 'bg-green-500 border-green-400'
                      : 'border-white/40 hover:border-green-400'
                  } transition-colors`}
                >
                  {currentQuestion.correctAnswer === index && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="text-white/80 text-sm">Time Limit:</label>
              <select
                value={currentQuestion.timeLimit}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, timeLimit: Number(e.target.value) })}
                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </div>
            <button
              onClick={addQuestion}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        </div>

        {/* Questions List */}
        {questions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Questions ({questions.length})</h3>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="bg-white/5 rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-white font-medium mb-2">
                      {index + 1}. {question.question}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {question.options.map((option, optIndex) => (
                        <span
                          key={optIndex}
                          className={`text-white/70 ${
                            question.correctAnswer === optIndex ? 'text-green-400 font-medium' : ''
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => removeQuestion(question.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Game Button */}
        <div className="text-center">
          <button
            onClick={createGame}
            disabled={!gameName || questions.length === 0 || totalTokens > userBalance}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-full flex items-center gap-3 mx-auto transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
          >
            <Coins className="w-5 h-5" />
            Create Game & Stake {totalTokens} QUIZ
            <Play className="w-5 h-5" />
          </button>
          
          {totalTokens > userBalance && (
            <p className="text-red-400 text-sm mt-2">Insufficient balance to create game</p>
          )}
        </div>
      </div>
    </div>
  );
};