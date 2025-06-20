// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TriviaGame
 * @dev Smart contract for managing trivia games with ERC20 token rewards
 * @author QuizChain Team
 */
contract TriviaGame is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    enum GameStatus {
        Created,
        Active,
        Completed,
        Cancelled
    }

    enum GameCategory {
        GeneralKnowledge,
        Crypto,
        Technology
    }

    struct Game {
        uint256 gameId;
        address organizer;
        IERC20 token;
        uint256 rewardPerQuestion;
        uint256 totalStaked;
        uint256 totalQuestions;
        uint256 totalParticipants;
        GameStatus status;
        uint256 startTime;
        uint256 endTime;
        mapping(address => bool) participants;
        mapping(address => uint256) scores;
        mapping(address => uint256) rewards;
        address[] participantList;
        GameCategory category;
        uint256 difficulty;
    }

    // State variables
    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public organizerGames;
    mapping(address => uint256[]) public participantGames;
    mapping(uint256 => uint256) public difficultyMultipliers;
    
    uint256 public nextGameId = 1;
    uint256 public platformFeePercent = 250; // 2.5%
    uint256 public constant MAX_PARTICIPANTS = 100;
    uint256 public constant MIN_REWARD = 1e15; // 0.001 tokens minimum
    
    address public feeRecipient;

    // Events
    event GameCreated(
        uint256 indexed gameId,
        address indexed organizer,
        address indexed token,
        uint256 rewardPerQuestion,
        uint256 totalQuestions
    );
    
    event GameStarted(uint256 indexed gameId, uint256 startTime);
    event GameCompleted(uint256 indexed gameId, uint256 endTime);
    event GameCancelled(uint256 indexed gameId, uint256 timestamp);
    
    event ParticipantJoined(uint256 indexed gameId, address indexed participant);
    event ScoreUpdated(uint256 indexed gameId, address indexed participant, uint256 score);
    event RewardDistributed(uint256 indexed gameId, address indexed participant, uint256 amount);
    event TokensStaked(uint256 indexed gameId, address indexed organizer, uint256 amount);
    event TokensWithdrawn(uint256 indexed gameId, address indexed organizer, uint256 amount);

    // Modifiers
    modifier gameExists(uint256 _gameId) {
        require(_gameId > 0 && _gameId < nextGameId, "Game does not exist");
        _;
    }

    modifier onlyOrganizer(uint256 _gameId) {
        require(games[_gameId].organizer == msg.sender, "Only organizer can call this");
        _;
    }

    modifier gameInStatus(uint256 _gameId, GameStatus _status) {
        require(games[_gameId].status == _status, "Game not in required status");
        _;
    }

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        
        // Initialize default difficulty multipliers
        difficultyMultipliers[1] = 100; // 1x
        difficultyMultipliers[2] = 150; // 1.5x
        difficultyMultipliers[3] = 200; // 2x
    }

    /**
     * @dev Create a new trivia game
     * @param _token ERC20 token address for rewards
     * @param _rewardPerQuestion Reward amount per question
     * @param _totalQuestions Total number of questions in the game
     * @param _category Game category
     * @param _difficulty Difficulty level
     */
    function createGame(
        IERC20 _token,
        uint256 _rewardPerQuestion,
        uint256 _totalQuestions,
        GameCategory _category,
        uint256 _difficulty
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(address(_token) != address(0), "Invalid token address");
        require(_rewardPerQuestion >= MIN_REWARD, "Reward too small");
        require(_totalQuestions > 0 && _totalQuestions <= 50, "Invalid question count");
        require(_difficulty >= 1 && _difficulty <= 3, "Invalid difficulty level");

        uint256 gameId = nextGameId++;
        uint256 totalStakeRequired = _rewardPerQuestion * _totalQuestions;

        // Transfer tokens from organizer to contract
        _token.safeTransferFrom(msg.sender, address(this), totalStakeRequired);

        // Initialize game
        Game storage game = games[gameId];
        game.gameId = gameId;
        game.organizer = msg.sender;
        game.token = _token;
        game.rewardPerQuestion = _rewardPerQuestion;
        game.totalStaked = totalStakeRequired;
        game.totalQuestions = _totalQuestions;
        game.status = GameStatus.Created;
        game.category = _category;
        game.difficulty = _difficulty;

        organizerGames[msg.sender].push(gameId);

        emit GameCreated(gameId, msg.sender, address(_token), _rewardPerQuestion, _totalQuestions);
        emit TokensStaked(gameId, msg.sender, totalStakeRequired);

        return gameId;
    }

    /**
     * @dev Cancel a game and refund staked tokens (only organizer)
     * @param _gameId Game ID to cancel
     */
    function cancelGame(uint256 _gameId) 
        external 
        whenNotPaused 
        gameExists(_gameId) 
        onlyOrganizer(_gameId) 
        nonReentrant 
    {
        Game storage game = games[_gameId];
        require(
            game.status == GameStatus.Created || game.status == GameStatus.Active,
            "Cannot cancel completed game"
        );

        // Refund staked tokens to organizer
        if (game.totalStaked > 0) {
            game.token.safeTransfer(game.organizer, game.totalStaked);
            emit TokensWithdrawn(_gameId, game.organizer, game.totalStaked);
        }

        game.status = GameStatus.Cancelled;
        emit GameCancelled(_gameId, block.timestamp);
    }

    /**
     * @dev Set difficulty multiplier (only owner)
     * @param _difficulty Difficulty level
     * @param _multiplier Multiplier value (in basis points, e.g., 150 = 1.5x)
     */
    function setDifficultyMultiplier(uint256 _difficulty, uint256 _multiplier) external onlyOwner {
        require(_difficulty >= 1 && _difficulty <= 3, "Invalid difficulty level");
        require(_multiplier >= 50 && _multiplier <= 500, "Invalid multiplier range");
        difficultyMultipliers[_difficulty] = _multiplier;
    }

    /**
     * @dev Join a game as a participant
     * @param _gameId Game ID to join
     */
    function joinGame(uint256 _gameId) 
        external 
        whenNotPaused 
        gameExists(_gameId) 
        gameInStatus(_gameId, GameStatus.Created) 
    {
        Game storage game = games[_gameId];
        require(!game.participants[msg.sender], "Already joined this game");
        require(game.totalParticipants < MAX_PARTICIPANTS, "Game is full");
        require(msg.sender != game.organizer, "Organizer cannot participate");

        game.participants[msg.sender] = true;
        game.participantList.push(msg.sender);
        game.totalParticipants++;
        participantGames[msg.sender].push(_gameId);

        emit ParticipantJoined(_gameId, msg.sender);
    }

    /**
     * @dev Start a game (only organizer)
     * @param _gameId Game ID to start
     */
    function startGame(uint256 _gameId) 
        external 
        whenNotPaused 
        gameExists(_gameId) 
        onlyOrganizer(_gameId) 
        gameInStatus(_gameId, GameStatus.Created) 
    {
        require(games[_gameId].totalParticipants > 0, "No participants");

        games[_gameId].status = GameStatus.Active;
        games[_gameId].startTime = block.timestamp;

        emit GameStarted(_gameId, block.timestamp);
    }

    /**
     * @dev Update participant scores (only organizer during active game)
     * @param _gameId Game ID
     * @param _participants Array of participant addresses
     * @param _scores Array of corresponding scores
     */
    function updateScores(
        uint256 _gameId,
        address[] calldata _participants,
        uint256[] calldata _scores
    ) 
        external 
        whenNotPaused 
        gameExists(_gameId) 
        onlyOrganizer(_gameId) 
        gameInStatus(_gameId, GameStatus.Active) 
    {
        require(_participants.length == _scores.length, "Arrays length mismatch");
        require(_participants.length > 0, "Empty arrays");

        Game storage game = games[_gameId];

        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i];
            require(game.participants[participant], "Not a participant");
            require(_scores[i] <= game.totalQuestions, "Score exceeds total questions");
            
            game.scores[participant] = _scores[i];
            emit ScoreUpdated(_gameId, participant, _scores[i]);
        }
    }

    /**
     * @dev Complete game and distribute rewards (only organizer)
     * @param _gameId Game ID to complete
     * @param _winners Array of winner addresses
     * @param _rewardAmounts Array of corresponding reward amounts
     */
    function completeGame(
        uint256 _gameId,
        address[] calldata _winners,
        uint256[] calldata _rewardAmounts
    ) 
        external 
        whenNotPaused 
        gameExists(_gameId) 
        onlyOrganizer(_gameId) 
        gameInStatus(_gameId, GameStatus.Active) 
        nonReentrant 
    {
        require(_winners.length == _rewardAmounts.length, "Arrays length mismatch");

        Game storage game = games[_gameId];
        uint256 totalRewards = _calculateTotalRewards(_rewardAmounts);
        require(totalRewards <= game.totalStaked, "Insufficient staked tokens");

        (uint256 platformFee, uint256 netRewards) = _calculateFeesAndNetRewards(totalRewards);

        uint256 distributedRewards = _distributeRewards(game, _gameId, _winners, _rewardAmounts, netRewards, totalRewards);

        // Transfer platform fee
        if (platformFee > 0) {
            _transferPlatformFee(game, platformFee);
        }

        _handleRemainingTokens(game, _gameId, distributedRewards, platformFee);

        game.status = GameStatus.Completed;
        game.endTime = block.timestamp;

        emit GameCompleted(_gameId, block.timestamp);
    }

    /**
     * @dev Emergency withdraw function (only owner)
     * @param _token Token to withdraw
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(IERC20 _token, uint256 _amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        _token.safeTransfer(owner(), _amount);
    }

    // View functions
    function getGame(uint256 _gameId) 
        external 
        view 
        gameExists(_gameId) 
        returns (
            address organizer,
            address token,
            uint256 rewardPerQuestion,
            uint256 totalStaked,
            uint256 totalQuestions,
            uint256 totalParticipants,
            GameStatus status,
            uint256 startTime,
            uint256 endTime,
            GameCategory category,
            uint256 difficulty
        ) 
    {
        Game storage game = games[_gameId];
        return (
            game.organizer,
            address(game.token),
            game.rewardPerQuestion,
            game.totalStaked,
            game.totalQuestions,
            game.totalParticipants,
            game.status,
            game.startTime,
            game.endTime,
            game.category,
            game.difficulty
        );
    }

    function getParticipants(uint256 _gameId) 
        external 
        view 
        gameExists(_gameId) 
        returns (address[] memory) 
    {
        return games[_gameId].participantList;
    }

    function getParticipantScore(uint256 _gameId, address _participant) 
        external 
        view 
        gameExists(_gameId) 
        returns (uint256) 
    {
        return games[_gameId].scores[_participant];
    }

    function getParticipantReward(uint256 _gameId, address _participant) 
        external 
        view 
        gameExists(_gameId) 
        returns (uint256) 
    {
        return games[_gameId].rewards[_participant];
    }

    function isParticipant(uint256 _gameId, address _participant) 
        external 
        view 
        gameExists(_gameId) 
        returns (bool) 
    {
        return games[_gameId].participants[_participant];
    }

    function getOrganizerGames(address _organizer) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return organizerGames[_organizer];
    }

    function getParticipantGames(address _participant) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return participantGames[_participant];
    }

    function getDifficultyMultiplier(uint256 _difficulty) 
        external 
        view 
        returns (uint256) 
    {
        return difficultyMultipliers[_difficulty];
    }

    // Admin functions
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee too high"); // Max 10%
        platformFeePercent = _feePercent;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Internal helper function to distribute reward to a single winner.
     * @param game Game storage reference
     * @param gameId Game ID
     * @param winner Address of the winner
     * @param amount Reward amount to distribute
     */
    function _distributeRewardToWinner(
        Game storage game,
        uint256 gameId,
        address winner,
        uint256 amount
    ) internal {
        game.rewards[winner] = amount;
        game.token.safeTransfer(winner, amount);
        emit RewardDistributed(gameId, winner, amount);
    }

    /**
     * @dev Internal helper function to transfer platform fee.
     * @param game Game storage reference
     * @param amount Amount of platform fee to transfer
     */
    function _transferPlatformFee(
        Game storage game,
        uint256 amount
    ) internal {
        game.token.safeTransfer(feeRecipient, amount);
    }

    /**
     * @dev Internal helper function to return remaining tokens to organizer.
     * @param game Game storage reference
     * @param gameId Game ID
     * @param amount Amount of remaining tokens to return
     */
    function _returnRemainingTokens(
        Game storage game,
        uint256 gameId,
        uint256 amount
    ) internal {
        game.token.safeTransfer(game.organizer, amount);
        emit TokensWithdrawn(gameId, game.organizer, amount);
    }

    /**
     * @dev Internal helper function to calculate total rewards.
     * @param _rewardAmounts Array of reward amounts
     * @return totalRewards Total sum of reward amounts
     */
    function _calculateTotalRewards(uint256[] calldata _rewardAmounts) internal pure returns (uint256) {
        uint256 totalRewards = 0;
        for (uint256 i = 0; i < _rewardAmounts.length; i++) {
            totalRewards += _rewardAmounts[i];
        }
        return totalRewards;
    }

    /**
     * @dev Internal helper function to calculate platform fee and net rewards.
     * @param _totalRewards Total rewards before fee deduction
     * @return platformFee Calculated platform fee
     * @return netRewards Calculated net rewards after fee deduction
     */
    function _calculateFeesAndNetRewards(uint256 _totalRewards) internal view returns (uint256, uint256) {
        uint256 platformFee = (_totalRewards * platformFeePercent) / 10000;
        uint256 netRewards = _totalRewards - platformFee;
        return (platformFee, netRewards);
    }

    /**
     * @dev Internal helper function to distribute rewards to multiple winners.
     * @param game Game storage reference
     * @param gameId Game ID
     * @param winners Array of winner addresses
     * @param rewardAmounts Array of corresponding reward amounts (proportional to total rewards)
     * @param netRewards Net rewards available for distribution after platform fee
     * @param totalRewards Total rewards before fee deduction
     * @return distributedRewards Total amount of rewards distributed
     */
    function _distributeRewards(
        Game storage game,
        uint256 gameId,
        address[] calldata winners,
        uint256[] calldata rewardAmounts,
        uint256 netRewards,
        uint256 totalRewards
    ) internal returns (uint256) {
        uint256 distributedRewards = 0;
        for (uint256 i = 0; i < winners.length; i++) {
            address winner = winners[i];
            require(game.participants[winner], "Winner not a participant");
            
            uint256 rewardAmount = (rewardAmounts[i] * netRewards) / totalRewards;
            if (rewardAmount > 0) {
                _distributeRewardToWinner(game, gameId, winner, rewardAmount);
                distributedRewards += rewardAmount;
            }
        }
        return distributedRewards;
    }

    /**
     * @dev Internal helper function to handle remaining tokens (return to organizer).
     * @param game Game storage reference
     * @param gameId Game ID
     * @param distributedRewards Amount of rewards already distributed
     * @param platformFee Amount of platform fee collected
     */
    function _handleRemainingTokens(
        Game storage game,
        uint256 gameId,
        uint256 distributedRewards,
        uint256 platformFee
    ) internal {
        uint256 remaining = game.totalStaked - distributedRewards - platformFee;
        if (remaining > 0) {
            _returnRemainingTokens(game, gameId, remaining);
        }
    }
}