import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  // Ensure the private key is provided
  if (!deployerPrivateKey) {
    throw new Error("Deployer private key not found in environment variables");
  }

  // Create a Wallet instance and connect it to the current network's provider
  const deployerWallet = new hre.ethers.Wallet(deployerPrivateKey, hre.ethers.provider);

  const { deploy } = hre.deployments;
  const { log } = hre.deployments;

  //print deployment address
  log(`Deployer address: ${deployerWallet.address}`);

  const deployedContract = await deploy("TrailMixManager", {
    from: deployerWallet.address,
    args: [], // Add your constructor arguments inside the array
    log: true,
    autoMine: true,
  });

  log(`🚀 TrailMixManager deployed to: ${deployedContract.address}`);
};

export default deployYourContract;
deployYourContract.tags = ["TrailMixManager"];


