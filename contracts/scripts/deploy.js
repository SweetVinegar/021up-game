const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy QuizToken
  console.log("\nDeploying QuizToken...");
  const QuizToken = await ethers.getContractFactory("QuizToken");
  const quizToken = await QuizToken.deploy();
  await quizToken.deployed();
  console.log("QuizToken deployed to:", quizToken.address);

  // Deploy TriviaGame
  console.log("\nDeploying TriviaGame...");
  const TriviaGame = await ethers.getContractFactory("TriviaGame");
  const triviaGame = await TriviaGame.deploy(deployer.address); // Fee recipient
  await triviaGame.deployed();
  console.log("TriviaGame deployed to:", triviaGame.address);

  // Add TriviaGame as minter for QuizToken
  console.log("\nAdding TriviaGame as minter...");
  await quizToken.addMinter(triviaGame.address);
  console.log("TriviaGame added as minter");

  // Transfer some tokens to TriviaGame for testing
  console.log("\nTransferring tokens for testing...");
  const transferAmount = ethers.utils.parseEther("1000000"); // 1M tokens
  await quizToken.transfer(triviaGame.address, transferAmount);
  console.log("Transferred 1M QUIZ tokens to TriviaGame");

  console.log("\n=== Deployment Summary ===");
  console.log("QuizToken:", quizToken.address);
  console.log("TriviaGame:", triviaGame.address);
  console.log("Deployer:", deployer.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    quizToken: quizToken.address,
    triviaGame: triviaGame.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });