import { supabase, Database } from '../lib/supabase';

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
      // 創建遊戲記錄
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          name: gameData.name,
          organizer_address: gameData.organizerAddress,
          token_address: '0x0000000000000000000000000000000000000000', // 預設代幣地址
          token_symbol: gameData.tokenSymbol,
          token_reward_per_question: gameData.tokenReward,
          total_staked: gameData.tokenReward * gameData.questions.length,
          status: 'waiting'
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // 創建問題記錄
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

      // 記錄質押交易
      await supabase
        .from('token_transactions')
        .insert({
          game_id: game.id,
          amount: gameData.tokenReward * gameData.questions.length,
          transaction_type: 'stake',
          status: 'confirmed'
        });

      return game.id;
    } catch (error) {
      console.error('創建遊戲錯誤:', error);
      throw error;
    }
  }

  async joinGame(gameId: string, participantData: {
    walletAddress: string;
    name: string;
  }) {
    try {
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
      return participant;
    } catch (error) {
      console.error('加入遊戲錯誤:', error);
      throw error;
    }
  }

  async startGame(gameId: string) {
    try {
      const { error } = await supabase
        .from('games')
        .update({
          status: 'active',
          start_time: new Date().toISOString()
        })
        .eq('id', gameId);

      if (error) throw error;
    } catch (error) {
      console.error('開始遊戲錯誤:', error);
      throw error;
    }
  }

  async submitAnswer(answerData: {
    participantId: string;
    questionId: string;
    selectedOption: number;
    timeToAnswer: number;
    isCorrect: boolean;
  }) {
    try {
      // 提交答案
      const { error: answerError } = await supabase
        .from('answers')
        .insert({
          participant_id: answerData.participantId,
          question_id: answerData.questionId,
          selected_option: answerData.selectedOption,
          time_to_answer: answerData.timeToAnswer,
          is_correct: answerData.isCorrect
        });

      if (answerError) throw answerError;

      // 如果答對了，更新分數和代幣獎勵
      if (answerData.isCorrect) {
        const speedBonus = Math.max(0, 1000 - answerData.timeToAnswer);
        const scoreIncrease = 1000 + Math.floor(speedBonus / 10);

        // 獲取當前參與者資料
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .select('score, tokens_earned, game_id')
          .eq('id', answerData.participantId)
          .single();

        if (participantError) throw participantError;

        // 獲取遊戲資料以取得代幣獎勵
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select('token_reward_per_question')
          .eq('id', participant.game_id)
          .single();

        if (gameError) throw gameError;

        // 更新參與者分數和代幣
        const { error: updateError } = await supabase
          .from('participants')
          .update({
            score: participant.score + scoreIncrease,
            tokens_earned: participant.tokens_earned + game.token_reward_per_question
          })
          .eq('id', answerData.participantId);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('提交答案錯誤:', error);
      throw error;
    }
  }

  async updateGameQuestion(gameId: string, questionIndex: number) {
    try {
      const { error } = await supabase
        .from('games')
        .update({
          current_question_index: questionIndex
        })
        .eq('id', gameId);

      if (error) throw error;
    } catch (error) {
      console.error('更新問題索引錯誤:', error);
      throw error;
    }
  }

  async completeGame(gameId: string, results: Array<{
    participantId: string;
    walletAddress: string;
    tokensEarned: number;
  }>) {
    try {
      // 更新遊戲狀態為完成
      const { error: gameError } = await supabase
        .from('games')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', gameId);

      if (gameError) throw gameError;

      // 記錄獎勵交易
      for (const result of results) {
        if (result.tokensEarned > 0) {
          await supabase
            .from('token_transactions')
            .insert({
              game_id: gameId,
              participant_id: result.participantId,
              amount: result.tokensEarned,
              transaction_type: 'reward',
              status: 'confirmed'
            });
        }
      }
    } catch (error) {
      console.error('完成遊戲錯誤:', error);
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
    const { data: participants, error } = await supabase
      .from('participants')
      .select(`
        *,
        games (*)
      `)
      .eq('wallet_address', walletAddress);

    if (error) throw error;
    return participants;
  }

  async getGameAnswers(gameId: string) {
    const { data: answers, error } = await supabase
      .from('answers')
      .select(`
        *,
        participants (*),
        questions (*)
      `)
      .in('participants.game_id', [gameId]);

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

  async getGameStats(gameId: string) {
    // 獲取遊戲統計資料
    const { data: stats, error } = await supabase
      .from('games')
      .select(`
        *,
        participants (count),
        questions (count),
        token_transactions (
          amount,
          transaction_type
        )
      `)
      .eq('id', gameId)
      .single();

    if (error) throw error;
    return stats;
  }

  async getLeaderboard(gameId: string) {
    const { data: leaderboard, error } = await supabase
      .from('participants')
      .select('*')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .order('tokens_earned', { ascending: false });

    if (error) throw error;
    return leaderboard;
  }
}

export const gameService = new GameService();