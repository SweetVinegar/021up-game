import { ethers } from 'ethers';

// Contract ABIs (simplified for demo)
export const TRIVIA_GAME_ABI = [
  "function createGame(address _token, uint256 _rewardPerQuestion, uint256 _totalQuestions, uint8 _category, uint8 _difficulty) external returns (uint256)",
  "function joinGame(uint256 gameId) external",
  "function startGame(uint256 gameId) external",
  "function updateScores(uint256 gameId, address[] participants, uint256[] scores) external",
  "function completeGame(uint256 gameId, address[] winners, uint256[] rewardAmounts) external",
  "function cancelGame(uint256 gameId) external",
  "function getGame(uint256 gameId) external view returns (address organizer, address token, uint256 rewardPerQuestion, uint256 totalStaked, uint256 totalQuestions, uint256 totalParticipants, uint8 status, uint256 startTime, uint256 endTime, uint8 category, uint256 difficulty)",
  "function isParticipant(uint256 gameId, address participant) external view returns (bool)",
  "function getParticipantScore(uint256 gameId, address participant) external view returns (uint256)",
  "function getParticipantReward(uint256 gameId, address participant) external view returns (uint256)",
  "event GameCreated(uint256 indexed gameId, address indexed organizer, address indexed token, uint256 rewardPerQuestion, uint256 totalQuestions)",
  "event ParticipantJoined(uint256 indexed gameId, address indexed participant)",
  "event GameStarted(uint256 indexed gameId, uint256 startTime)",
  "event GameCompleted(uint256 indexed gameId, uint256 endTime)",
  "event RewardDistributed(uint256 indexed gameId, address indexed participant, uint256 amount)",
  "function setPlatformFee(uint256 _feePercent) external",
  "function setFeeRecipient(address _feeRecipient) external",
  "function pause() external",
  "function unpause() external",
  "function setDifficultyMultiplier(uint256 _difficulty, uint256 _multiplier) external"
];

export const QUIZ_TOKEN_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function addMinter(address minter) external",
  "function removeMinter(address minter) external",
  "function isMinter(address minter) external view returns (bool)",
  "function pause() external",
  "function unpause() external"
];

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  TRIVIA_GAME: import.meta.env.VITE_TRIVIA_GAME_ADDRESS || '0x78afd8e9d94da6c232cab43fe88131463ea3fa78',
  QUIZ_TOKEN: import.meta.env.VITE_QUIZ_TOKEN_ADDRESS || '0xb24307c8a40a0dc5609674456b58148d65fbf50c',
};

export class BlockchainService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private triviaGameContract: ethers.Contract | null = null;
  private quizTokenContract: ethers.Contract | null = null;

  async connectWallet(): Promise<{ address: string; balance: string }> {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();
    
    const address = await this.signer.getAddress();
    const balance = await this.getTokenBalance(address);

    // Initialize contracts
    this.triviaGameContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TRIVIA_GAME,
      TRIVIA_GAME_ABI,
      this.signer
    );

    this.quizTokenContract = new ethers.Contract(
      CONTRACT_ADDRESSES.QUIZ_TOKEN,
      QUIZ_TOKEN_ABI,
      this.signer
    );

    return { address, balance };
  }

  async getTokenBalance(address: string): Promise<string> {
    if (!this.provider) throw new Error('Wallet not connected');
    
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.QUIZ_TOKEN,
      QUIZ_TOKEN_ABI,
      this.provider
    );
    
    const balance = await contract.balanceOf(address);
    return ethers.formatEther(balance);
  }

  async createGame(
    tokenAddress: string,
    rewardPerQuestion: string,
    totalQuestions: number,
    category: number,
    difficulty: number
  ): Promise<{ gameId: number; txHash: string }> {
    if (!this.triviaGameContract || !this.quizTokenContract) {
      throw new Error('Contracts not initialized');
    }

    const rewardAmount = ethers.parseEther(rewardPerQuestion);
    const totalStake = rewardAmount * BigInt(totalQuestions);

    // First approve tokens
    const approveTx = await this.quizTokenContract.approve(
      CONTRACT_ADDRESSES.TRIVIA_GAME,
      totalStake
    );
    await approveTx.wait();

    // Create game
    const tx = await this.triviaGameContract.createGame(
      tokenAddress,
      rewardAmount,
      totalQuestions,
      category,
      difficulty
    );
    
    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.triviaGameContract!.interface.parseLog(log);
        return parsed?.name === 'GameCreated';
      } catch {
        return false;
      }
    });

    if (!event) throw new Error('Game creation failed');
    
    const parsedEvent = this.triviaGameContract.interface.parseLog(event);
    if (!parsedEvent) throw new Error('Failed to parse GameCreated event');
    const gameId = Number(parsedEvent.args.gameId);

    return { gameId, txHash: tx.hash };
  }

  async joinGame(gameId: number): Promise<string> {
    if (!this.triviaGameContract) throw new Error('Contract not initialized');
    
    const tx = await this.triviaGameContract.joinGame(gameId);
    await tx.wait();
    return tx.hash;
  }

  async startGame(gameId: number): Promise<string> {
    if (!this.triviaGameContract) throw new Error('Contract not initialized');
    
    const tx = await this.triviaGameContract.startGame(gameId);
    await tx.wait();
    return tx.hash;
  }

  async updateScores(
    gameId: number,
    participants: string[],
    scores: number[]
  ): Promise<string> {
    if (!this.triviaGameContract) throw new Error('Contract not initialized');
    
    const tx = await this.triviaGameContract.updateScores(gameId, participants, scores);
    await tx.wait();
    return tx.hash;
  }

  async completeGame(
    gameId: number,
    winners: string[],
    rewards: string[]
  ): Promise<string> {
    if (!this.triviaGameContract) throw new Error('Contract not initialized');
    
    const rewardAmounts = rewards.map(r => ethers.parseEther(r));
    const tx = await this.triviaGameContract.completeGame(gameId, winners, rewardAmounts);
    await tx.wait();
    return tx.hash;
  }

  async getGameInfo(gameId: number) {
    if (!this.triviaGameContract) throw new Error('Contract not initialized');
    
    const gameInfo = await this.triviaGameContract.getGame(gameId);
    return {
      organizer: gameInfo.organizer,
      token: gameInfo.token,
      rewardPerQuestion: ethers.formatEther(gameInfo.rewardPerQuestion),
      totalStaked: ethers.formatEther(gameInfo.totalStaked),
      totalQuestions: Number(gameInfo.totalQuestions),
      totalParticipants: Number(gameInfo.totalParticipants),
      status: Number(gameInfo.status),
      startTime: Number(gameInfo.startTime),
      endTime: Number(gameInfo.endTime),
      category: Number(gameInfo.category),
      difficulty: Number(gameInfo.difficulty)
    };
  }

  async isParticipant(gameId: number, address: string): Promise<boolean> {
    if (!this.triviaGameContract) throw new Error('Contract not initialized');
    return await this.triviaGameContract.isParticipant(gameId, address);
  }

  async getParticipantScore(gameId: number, address: string): Promise<number> {
    if (!this.triviaGameContract) throw new Error('Contract not initialized');
    return Number(await this.triviaGameContract.getParticipantScore(gameId, address));
  }

  async getParticipantReward(gameId: number, address: string): Promise<string> {
    if (!this.triviaGameContract) throw new Error('Contract not initialized');
    const reward = await this.triviaGameContract.getParticipantReward(gameId, address);
    return ethers.formatEther(reward);
  }
}

export const blockchainService = new BlockchainService();