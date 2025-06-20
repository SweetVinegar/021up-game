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

4. **Deploy Smart Contracts (Remix IDE)**
   - **QuizToken.sol**: `0xb24307c8a40a0dc5609674456b58148d65fbf50c`
   - **TriviaGame.sol**: `0x78afd8e9d94da6c232cab43fe88131463ea3fa78`

   **Remix IDE 部署步骤**：
   1.  打开 Remix IDE (remix.ethereum.org)。
   2.  在文件浏览器中导入 `QuizToken.sol` 和 `TriviaGame.sol` 文件。
   3.  编译两个合约（选择合适的 Solidity 版本，例如 0.8.19）。
   4.  在部署和运行交易面板中，选择 `QuizToken.sol` 合约，确保选择正确的环境（例如 Injected Provider - MetaMask 或 Remix VM）。部署 `QuizToken` 合约。
   5.  部署成功后，复制 `QuizToken` 合约的地址。
   6.  选择 `TriviaGame.sol` 合约进行部署。在部署参数中，`_quizTokenAddress` 参数填写刚刚复制的 `QuizToken` 合约地址，`_feeRecipient` 参数填写你的接收费用地址（例如你的 MetaMask 地址）。
   7.  部署 `TriviaGame` 合约。
   8.  部署完成后，需要将 `TriviaGame` 合约设置为 `QuizToken` 的铸币者（Minter）。在 Remix 中与已部署的 `QuizToken` 合约交互，调用 `addMinter` 函数，并传入 `TriviaGame` 合约的地址。
   9.  为了测试，可以向 `TriviaGame` 合约转移一些 `QuizToken`。在 Remix 中与已部署的 `QuizToken` 合约交互，调用 `transfer` 函数，将一定数量的 `QuizToken` 转移到 `TriviaGame` 合约地址。

   **合约与网站互动**：
   - 网站前端通过 `ethers.js` 库与部署在区块链上的 `TriviaGame` 和 `QuizToken` 智能合约进行交互。
   - `src/lib/blockchain.ts` 文件中定义了合约的 ABI 和地址，前端应用通过这些信息调用合约的函数，例如创建游戏、加入游戏、提交答案、分发奖励等。
   - `QuizToken` 合约负责管理游戏中的代币，包括铸造、销毁和转移。
   - `TriviaGame` 合约包含了游戏的核心逻辑，处理游戏状态、玩家交互和奖励分配。
   - 前端会读取 `VITE_TRIVIA_GAME_ADDRESS` 和 `VITE_QUIZ_TOKEN_ADDRESS` 环境变量来获取部署的合约地址。在 Remix 部署后，你需要手动更新这些环境变量或直接在代码中配置合约地址，以便前端能够正确连接到已部署的合约。

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