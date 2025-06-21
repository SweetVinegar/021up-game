/*
  # Trivia Game Platform Database Schema

  1. New Tables
    - `games`
      - `id` (uuid, primary key)
      - `name` (text)
      - `organizer_address` (text)
      - `token_address` (text)
      - `token_symbol` (text)
      - `token_reward_per_question` (bigint)
      - `total_staked` (bigint)
      - `status` (text: 'waiting', 'active', 'completed')
      - `current_question_index` (integer)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `questions`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key)
      - `question_text` (text)
      - `options` (jsonb array)
      - `correct_answer` (integer)
      - `time_limit` (integer)
      - `order_index` (integer)
      - `created_at` (timestamptz)

    - `participants`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key)
      - `wallet_address` (text)
      - `name` (text)
      - `score` (integer)
      - `tokens_earned` (bigint)
      - `joined_at` (timestamptz)

    - `answers`
      - `id` (uuid, primary key)
      - `participant_id` (uuid, foreign key)
      - `question_id` (uuid, foreign key)
      - `selected_option` (integer)
      - `time_to_answer` (integer)
      - `is_correct` (boolean)
      - `answered_at` (timestamptz)

    - `token_transactions`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key)
      - `participant_id` (uuid, foreign key)
      - `transaction_hash` (text)
      - `amount` (bigint)
      - `transaction_type` (text: 'stake', 'reward')
      - `status` (text: 'pending', 'confirmed', 'failed')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for game organizers to manage their games
    - Add policies for participants to view game data and submit answers
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organizer_address text NOT NULL,
  token_address text NOT NULL,
  token_symbol text NOT NULL DEFAULT 'QUIZ',
  token_reward_per_question bigint NOT NULL DEFAULT 0,
  total_staked bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  current_question_index integer NOT NULL DEFAULT 0,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  time_limit integer NOT NULL DEFAULT 30,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  tokens_earned bigint NOT NULL DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(game_id, wallet_address)
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option integer NOT NULL,
  time_to_answer integer NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, question_id)
);

-- Create token_transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  transaction_hash text,
  amount bigint NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('stake', 'reward')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Games policies
CREATE POLICY "Anyone can view games"
  ON games
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Organizers can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (organizer_address = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Organizers can update their games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (organizer_address = auth.jwt() ->> 'wallet_address');

-- Questions policies
CREATE POLICY "Anyone can view questions for active games"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = questions.game_id 
      AND games.status IN ('active', 'completed')
    )
  );

CREATE POLICY "Organizers can manage questions for their games"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = questions.game_id 
      AND games.organizer_address = auth.jwt() ->> 'wallet_address'
    )
  );

-- Participants policies
CREATE POLICY "Anyone can view participants"
  ON participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join games"
  ON participants
  FOR INSERT
  TO authenticated
  WITH CHECK (wallet_address = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can update their participation"
  ON participants
  FOR UPDATE
  TO authenticated
  USING (wallet_address = auth.jwt() ->> 'wallet_address');

-- Answers policies
CREATE POLICY "Users can view answers for completed games"
  ON answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN games g ON p.game_id = g.id
      WHERE p.id = answers.participant_id
      AND g.status = 'completed'
    )
  );

CREATE POLICY "Users can submit answers for their participation"
  ON answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = answers.participant_id
      AND participants.wallet_address = auth.jwt() ->> 'wallet_address'
    )
  );

-- Token transactions policies
CREATE POLICY "Users can view their own answers"
  ON answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = answers.participant_id
      AND participants.wallet_address = auth.jwt() ->> 'wallet_address'
    )
  );

CREATE POLICY "Users can view their own token transactions"
  ON token_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = participant_id
      AND participants.wallet_address = auth.jwt() ->> 'wallet_address'
    )
  );

CREATE POLICY "System can create transactions"
  ON token_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_organizer ON games(organizer_address);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_questions_game_id ON questions(game_id);
CREATE INDEX IF NOT EXISTS idx_participants_game_id ON participants(game_id);
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON participants(wallet_address);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_game_id ON token_transactions(game_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for games table
CREATE TRIGGER update_games_updated_at 
  BEFORE UPDATE ON games 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();