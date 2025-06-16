import React, { useState, useEffect } from 'react';
import { Clock, Users, Trophy } from 'lucide-react';
import { GameRoom, Answer } from '../types';

interface GamePlayProps {
  gameRoom: GameRoom;
  onSubmitAnswer: (answer: Answer) => void;
  userAddress: string;
  onGameComplete: () => void;
}

export const GamePlay: React.FC<GamePlayProps> = ({
  gameRoom,
  onSubmitAnswer,
  userAddress,
  onGameComplete,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  const currentQuestion = gameRoom.questions[gameRoom.currentQuestionIndex];
  const participant = gameRoom.participants.find(p => p.address === userAddress);
  
  useEffect(() => {
    setTimeLeft(currentQuestion.timeLimit);
    setHasSubmitted(false);
    setSelectedOption(null);
    setStartTime(Date.now());
  }, [gameRoom.currentQuestionIndex, currentQuestion.timeLimit]);

  useEffect(() => {
    if (timeLeft > 0 && !hasSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !hasSubmitted) {
      // Auto-submit when time runs out
      handleSubmit();
    }
  }, [timeLeft, hasSubmitted]);

  const handleSubmit = () => {
    if (hasSubmitted) return;
    
    const timeToAnswer = Date.now() - startTime;
    const answer: Answer = {
      questionId: currentQuestion.id,
      selectedOption: selectedOption ?? -1,
      timeToAnswer,
      isCorrect: selectedOption === currentQuestion.correctAnswer,
    };

    onSubmitAnswer(answer);
    setHasSubmitted(true);

    // Auto-advance to next question or complete game
    setTimeout(() => {
      if (gameRoom.currentQuestionIndex < gameRoom.questions.length - 1) {
        // Next question will be handled by parent component
      } else {
        onGameComplete();
      }
    }, 2000);
  };

  const getProgressWidth = () => {
    return ((currentQuestion.timeLimit - timeLeft) / currentQuestion.timeLimit) * 100;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/20 rounded-full px-4 py-2">
              <span className="text-purple-400 font-semibold">
                Question {gameRoom.currentQuestionIndex + 1} of {gameRoom.questions.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Users className="w-4 h-4" />
              <span>{gameRoom.participants.length} players</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-white/70" />
            <span className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-8">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'
            }`}
            style={{ width: `${getProgressWidth()}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-white/5 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center leading-relaxed">
            {currentQuestion.question}
          </h2>

          {/* Options */}
          <div className="grid md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !hasSubmitted && setSelectedOption(index)}
                disabled={hasSubmitted}
                className={`p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                  hasSubmitted
                    ? index === currentQuestion.correctAnswer
                      ? 'bg-green-500/20 border-green-400 text-green-300'
                      : selectedOption === index && index !== currentQuestion.correctAnswer
                      ? 'bg-red-500/20 border-red-400 text-red-300'
                      : 'bg-white/5 border-white/20 text-white/60'
                    : selectedOption === index
                    ? 'bg-purple-500/20 border-purple-400 text-white transform scale-105'
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/40 hover:scale-102'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${
                    hasSubmitted && index === currentQuestion.correctAnswer
                      ? 'border-green-400 bg-green-500 text-white'
                      : selectedOption === index
                      ? 'border-purple-400 bg-purple-500 text-white'
                      : 'border-white/40 text-white/70'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="flex-1 text-lg">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Submit Button */}
          {!hasSubmitted && selectedOption !== null && (
            <div className="text-center mt-8">
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Submit Answer
              </button>
            </div>
          )}
        </div>

        {/* Player Score */}
        {participant && (
          <div className="bg-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <span className="text-white font-semibold">Your Score</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{participant.score}</p>
                <p className="text-white/60 text-sm">{participant.tokensEarned} QUIZ earned</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};