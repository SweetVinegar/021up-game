const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TriviaGame", function () {
  let quizToken, triviaGame;
  let owner, organizer, participant1, participant2, feeRecipient;
  let gameId;

  beforeEach(async function () {
    [owner, organizer, participant1, participant2, feeRecipient] = await ethers.getSigners();

    // Deploy QuizToken
    const QuizToken = await ethers.getContractFactory("QuizToken");
    quizToken = await QuizToken.deploy();
    await quizToken.deployed();

    // Deploy TriviaGame
    const TriviaGame = await ethers.getContractFactory("TriviaGame");
    triviaGame = await TriviaGame.deploy(feeRecipient.address);
    await triviaGame.deployed();

    // Transfer tokens to organizer for testing
    const transferAmount = ethers.utils.parseEther("10000");
    await quizToken.transfer(organizer.address, transferAmount);
  });

  describe("Game Creation", function () {
    it("Should create a game successfully", async function () {
      const rewardPerQuestion = ethers.utils.parseEther("100");
      const totalQuestions = 5;
      const totalStake = rewardPerQuestion.mul(totalQuestions);

      // Approve tokens
      await quizToken.connect(organizer).approve(triviaGame.address, totalStake);

      // Create game
      const tx = await triviaGame.connect(organizer).createGame(
        quizToken.address,
        rewardPerQuestion,
        totalQuestions
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "GameCreated");
      gameId = event.args.gameId;

      expect(gameId).to.equal(1);
      
      const game = await triviaGame.getGame(gameId);
      expect(game.organizer).to.equal(organizer.address);
      expect(game.rewardPerQuestion).to.equal(rewardPerQuestion);
      expect(game.totalQuestions).to.equal(totalQuestions);
    });

    it("Should fail with insufficient token approval", async function () {
      const rewardPerQuestion = ethers.utils.parseEther("100");
      const totalQuestions = 5;

      await expect(
        triviaGame.connect(organizer).createGame(
          quizToken.address,
          rewardPerQuestion,
          totalQuestions
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Game Participation", function () {
    beforeEach(async function () {
      const rewardPerQuestion = ethers.utils.parseEther("100");
      const totalQuestions = 5;
      const totalStake = rewardPerQuestion.mul(totalQuestions);

      await quizToken.connect(organizer).approve(triviaGame.address, totalStake);
      const tx = await triviaGame.connect(organizer).createGame(
        quizToken.address,
        rewardPerQuestion,
        totalQuestions
      );
      
      const receipt = await tx.wait();
      gameId = receipt.events.find(e => e.event === "GameCreated").args.gameId;
    });

    it("Should allow participants to join", async function () {
      await triviaGame.connect(participant1).joinGame(gameId);
      
      const isParticipant = await triviaGame.isParticipant(gameId, participant1.address);
      expect(isParticipant).to.be.true;
    });

    it("Should prevent organizer from joining their own game", async function () {
      await expect(
        triviaGame.connect(organizer).joinGame(gameId)
      ).to.be.revertedWith("Organizer cannot participate");
    });

    it("Should prevent double joining", async function () {
      await triviaGame.connect(participant1).joinGame(gameId);
      
      await expect(
        triviaGame.connect(participant1).joinGame(gameId)
      ).to.be.revertedWith("Already joined this game");
    });
  });

  describe("Game Flow", function () {
    beforeEach(async function () {
      const rewardPerQuestion = ethers.utils.parseEther("100");
      const totalQuestions = 5;
      const totalStake = rewardPerQuestion.mul(totalQuestions);

      await quizToken.connect(organizer).approve(triviaGame.address, totalStake);
      const tx = await triviaGame.connect(organizer).createGame(
        quizToken.address,
        rewardPerQuestion,
        totalQuestions
      );
      
      const receipt = await tx.wait();
      gameId = receipt.events.find(e => e.event === "GameCreated").args.gameId;

      // Add participants
      await triviaGame.connect(participant1).joinGame(gameId);
      await triviaGame.connect(participant2).joinGame(gameId);
    });

    it("Should start game successfully", async function () {
      await triviaGame.connect(organizer).startGame(gameId);
      
      const game = await triviaGame.getGame(gameId);
      expect(game.status).to.equal(1); // Active
    });

    it("Should update scores during active game", async function () {
      await triviaGame.connect(organizer).startGame(gameId);
      
      const participants = [participant1.address, participant2.address];
      const scores = [1000, 800];
      
      await triviaGame.connect(organizer).updateScores(gameId, participants, scores);
      
      const score1 = await triviaGame.getParticipantScore(gameId, participant1.address);
      const score2 = await triviaGame.getParticipantScore(gameId, participant2.address);
      
      expect(score1).to.equal(1000);
      expect(score2).to.equal(800);
    });

    it("Should complete game and distribute rewards", async function () {
      await triviaGame.connect(organizer).startGame(gameId);
      
      const winners = [participant1.address, participant2.address];
      const rewards = [ethers.utils.parseEther("300"), ethers.utils.parseEther("200")];
      
      const initialBalance1 = await quizToken.balanceOf(participant1.address);
      const initialBalance2 = await quizToken.balanceOf(participant2.address);
      
      await triviaGame.connect(organizer).completeGame(gameId, winners, rewards);
      
      const finalBalance1 = await quizToken.balanceOf(participant1.address);
      const finalBalance2 = await quizToken.balanceOf(participant2.address);
      
      expect(finalBalance1.gt(initialBalance1)).to.be.true;
      expect(finalBalance2.gt(initialBalance2)).to.be.true;
      
      const game = await triviaGame.getGame(gameId);
      expect(game.status).to.equal(2); // Completed
    });
  });

  describe("Game Cancellation", function () {
    it("Should cancel game and refund tokens", async function () {
      const rewardPerQuestion = ethers.utils.parseEther("100");
      const totalQuestions = 5;
      const totalStake = rewardPerQuestion.mul(totalQuestions);

      await quizToken.connect(organizer).approve(triviaGame.address, totalStake);
      const tx = await triviaGame.connect(organizer).createGame(
        quizToken.address,
        rewardPerQuestion,
        totalQuestions
      );
      
      const receipt = await tx.wait();
      gameId = receipt.events.find(e => e.event === "GameCreated").args.gameId;

      const initialBalance = await quizToken.balanceOf(organizer.address);
      
      await triviaGame.connect(organizer).cancelGame(gameId);
      
      const finalBalance = await quizToken.balanceOf(organizer.address);
      expect(finalBalance).to.equal(initialBalance.add(totalStake));
      
      const game = await triviaGame.getGame(gameId);
      expect(game.status).to.equal(3); // Cancelled
    });
  });
});