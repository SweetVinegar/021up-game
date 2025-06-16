# QuizChain - Blockchain Trivia Game Platform

A decentralized trivia game platform where organizers can create games, stake ERC20 tokens as rewards, and participants compete to earn tokens through their knowledge and speed.

## Features

### 🎮 Game Management
- **Create Games**: Organizers can set up trivia games with custom questions
- **Token Staking**: Stake ERC20 tokens as rewards for participants
- **Real-time Gameplay**: Live trivia sessions with time-limited questions
- **Automatic Distribution**: Smart contracts handle reward distribution

### 🏆 Competitive Elements
- **Score-based Rewards**: Higher scores earn more tokens
- **Speed Bonuses**: Faster correct answers get bonus points
- **Leaderboards**: Real-time ranking during games
- **Performance Analytics**: Detailed statistics for each participant

### 🔗 Blockchain Integration
- **Smart Contracts**: Secure token staking and distribution
- **ERC20 Support**: Compatible with any ERC20 token
- **MetaMask Integration**: Easy wallet connection
- **Transaction Tracking**: Full transparency of all token movements

### 📊 Database Features
- **Supabase Backend**: Scalable PostgreSQL database
- **Real-time Updates**: Live game state synchronization
- **Comprehensive Analytics**: Game history and participant statistics
- **Secure Access**: Row-level security policies

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Ethers.js** for blockchain interaction

### Backend
- **Supabase** for database and real-time features
- **PostgreSQL** with advanced indexing
- **Row Level Security** for data protection

### Blockchain
- **Solidity 0.8.19** smart contracts
- **OpenZeppelin** security standards
- **Hardhat** development framework
- **Multi-chain support** (Ethereum, Polygon, BSC)

## Smart Contracts

### TriviaGame.sol
Main contract handling game logic:
- Game creation and management
- Participant registration
- Score tracking and updates
- Reward distribution with platform fees
- Emergency functions for security

### QuizToken.sol
ERC20 token with additional features:
- Mintable with supply cap
- Burnable tokens
- Batch transfer functionality
- Pausable for emergency situations

## Database Schema

### Core Tables
- **games**: Game metadata and configuration
- **questions**: Trivia questions with multiple choice options
- **participants**: Player information and scores
- **answers**: Individual answer submissions
- **token_transactions**: Blockchain transaction tracking

### Security Features
- Row Level Security (RLS) enabled on all tables
- Authenticated user policies
- Organizer-specific permissions
- Participant data protection

## Getting Started

### Prerequisites
- Node.js 18+
- MetaMask or compatible Web3 wallet
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quizchain
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd contracts && npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the migration file to set up the database schema
   - Update environment variables

4. **Deploy Smart Contracts**
   ```bash
   cd contracts
   cp .env.example .env
   # Edit .env with your configuration
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network sepolia
   ```

5. **Configure Environment**
   ```bash
   # Update with your Supabase and contract addresses
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_TRIVIA_GAME_ADDRESS=deployed_contract_address
   VITE_QUIZ_TOKEN_ADDRESS=deployed_token_address
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## Usage

### For Organizers
1. **Connect Wallet**: Link your MetaMask wallet
2. **Create Game**: Set up questions and stake tokens
3. **Manage Lobby**: Wait for participants to join
4. **Start Game**: Begin the trivia session
5. **Distribute Rewards**: Automatic token distribution based on performance

### For Participants
1. **Connect Wallet**: Link your MetaMask wallet
2. **Join Game**: Enter a game lobby
3. **Play Trivia**: Answer questions quickly and correctly
4. **Earn Rewards**: Receive tokens based on performance
5. **View History**: Check past games and earnings

## Smart Contract Deployment

### Supported Networks
- **Ethereum Mainnet**
- **Ethereum Sepolia** (Testnet)
- **Polygon**
- **Binance Smart Chain**

### Deployment Commands
```bash
# Compile contracts
npx hardhat compile

# Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts
npx hardhat verify --network sepolia DEPLOYED_ADDRESS

# Run tests
npx hardhat test
```

## Security Features

### Smart Contract Security
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency pause functionality
- **Access Control**: Role-based permissions
- **SafeERC20**: Secure token transfers
- **Input Validation**: Comprehensive parameter checking

### Database Security
- **Row Level Security**: User-specific data access
- **Authenticated Policies**: Secure API endpoints
- **Input Sanitization**: SQL injection prevention
- **Audit Logging**: Transaction history tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation wiki

---

Built with ❤️ for the decentralized gaming community