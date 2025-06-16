import { supabase, Database } from '../lib/supabase';
import { blockchainService } from '../lib/blockchain';

type Game = Database['public']['Tables']['games']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type Participant = Database['public']['Tables']['participants']['Row'];
type Answer = Database['public']['Tables']['answers']['Row'];
type TokenTransaction = Database['public']['Tables']['token_transactions']['Row'];

export class GameService {
  async createGame(gameData: {
    name: string;
    organizerAddress: string;
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      timeLimit: number;
    }>;
    tokenReward: number;
    tokenSymbol: string;
  }) {
    try {
      // Create game on blockchain first
      const { gameId: blockchainGameId, txHash } = await blockchainService.createGame(
        '0x0000000000000000000000000000000000000000', // Token address
        gameData.tokenReward.toString(),
        gameData.questions.length
      );

      // Create game in database
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          name: gameData.name,
          organizer_address: gameData.organizerAddress,
          token_address: '0x0000000000000000000000000000000000000000',
          token_symbol: gameData.tokenSymbol,
          token_reward_per_question: gameData.tokenReward,
          total_staked: gameData.tokenReward * gameData.questions.length,
          status: 'waiting'
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Create questions
      const questionsToInsert = gameData.questions.map((q, index) => ({
        game_id: game.id,
        question_text: q.question,
        options: q.options,
        correct_answer: q.correctAnswer,
        time_limit: q.timeLimit,
        order_index: index
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      // Record staking transaction
      await supabase
        .from('token_transactions')
        .insert({
          game_id: game.id,
          transaction_hash: txHash,
          amount: gameData.tokenReward * gameData.questions.length,
          transaction_type: 'stake',
          status: 'confirmed'
        });

      return { gameId: game.id, blockchainGameId };
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  async joinGame(gameId: string, participantData: {
    walletAddress: string;
    name: string;
  }) {
    try {
      // Join game on blockchain
      const txHash = await blockchainService.joinGame(1); // Use blockchain game ID

      // Add participant to database
      const { data: participant, error } = await supabase
        .from('participants')
        .insert({
          game_id: gameId,
          wallet_address: participantData.walletAddress,
          name: participantData.name
        })
        .select()
        .single();

      if (error) throw error;

      return { participant, txHash };
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  }

  async startGame(gameId: string) {
    try {
      // Start game on blockchain
      const txHash = await blockchainService.startGame(1); // Use blockchain game ID

      // Update game status in database
      const { error } = await supabase
        .from('games')
        .update({
          status: 'active',
          start_time: new Date().toISOString()
        })
        .eq('id', gameId);

      if (error) throw error;

      return txHash;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }

  async submitAnswer(answerId: string, answerData: {
    participantId: string;
    questionId: string;
    selectedOption: number;
    timeToAnswer: number;
    isCorrect: boolean;
  }) {
    try {
      const { error } = await supabase
        .from('answers')
        .insert({
          participant_id: answerData.participantId,
          question_id: answerData.questionId,
          selected_option: answerData.selectedOption,
          time_to_answer: answerData.timeToAnswer,
          is_correct: answerData.isCorrect
        });

      if (error) throw error;

      // Update participant score
      if (answerData.isCorrect) {
        const speedBonus = Math.max(0, 1000 - answerData.timeToAnswer);
        const scoreIncrease = 1000 + Math.floor(speedBonus / 10);

        await supabase.rpc('increment_score', {
          participant_id: answerData.participantId,
          score_increase: scoreIncrease
        });
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  async completeGame(gameId: string, results: Array<{
    participantId: string;
    walletAddress: string;
    tokensEarned: number;
  }>) {
    try {
      // Prepare blockchain data
      const winners = results.map(r => r.walletAddress);
      const rewards = results.map(r => r.tokensEarned.toString());

      // Complete game on blockchain
      const txHash = await blockchainService.completeGame(1, winners, rewards);

      // Update game status
      await supabase
        .from('games')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', gameId);

      // Update participant rewards
      for (const result of results) {
        await supabase
          .from('participants')
          .update({
            tokens_earned: result.tokensEarned
          })
          .eq('id', result.participantId);

        // Record reward transaction
        if (result.tokensEarned > 0) {
          await supabase
            .from('token_transactions')
            .insert({
              game_id: gameId,
              participant_id: result.participantId,
              transaction_hash: txHash,
              amount: result.tokensEarned,
              transaction_type: 'reward',
              status: 'confirmed'
            });
        }
      }

      return txHash;
    } catch (error) {
      console.error('Error completing game:', error);
      throw error;
    }
  }

  async getGame(gameId: string) {
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        questions (*),
        participants (*)
      `)
      .eq('id', gameId)
      .single();

    if (error) throw error;
    return game;
  }

  async getGamesByOrganizer(organizerAddress: string) {
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .eq('organizer_address', organizerAddress)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return games;
  }

  async getParticipantGames(walletAddress: string) {
    const { data: games, error } = await supabase
      .from('participants')
      .select(`
        *,
        games (*)
      `)
      .eq('wallet_address', walletAddress);

    if (error) throw error;
    return games;
  }

  async getGameAnswers(gameId: string) {
    const { data: answers, error } = await supabase
      .from('answers')
      .select(`
        *,
        participants (*),
        questions (*)
      `)
      .eq('participants.game_id', gameId);

    if (error) throw error;
    return answers;
  }

  async getTokenTransactions(gameId: string) {
    const { data: transactions, error } = await supabase
      .from('token_transactions')
      .select(`
        *,
        participants (*)
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return transactions;
  }
}

export const gameService = new GameService();