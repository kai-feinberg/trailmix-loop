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

  // const deployedContract = await deploy("TrailMixManager", {
  //   from: deployerWallet.address,
  //   args: [], // Add your constructor arguments inside the array
  //   log: true,
  //   autoMine: true,
  // });
  
  // log(`🚀 TrailMixManager deployed to: ${deployedContract.address}`);
  const deployedContract = await deploy("TrailMix", {
    from: deployerWallet.address,
    args: [
      "0x6eF8DfBF3F6904e48581Ce9Bf5a454af38c6aCD2", // manager address
      "0x2cb509BE01144aF14FCF944957c401C14c6dF722", //creator


      "0x4200000000000000000000000000000000000042", // erc20 token
      "0x4200000000000000000000000000000000000006", // stablecoin token

      "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", //uniswap router address

      "0x68F5C0A2DE713a54991E01858Fd27a3832401849",//uniswap pool address

      "0x9Af728C794f68E457f8ffBF763155622Da66dd62", //uniswap oracle

      "10", //trail amount
      "1", //granularity
      "3000", //pool fee

      "0xb7B9A39CC63f856b90B364911CC324dC46aC1770", //optimism eth price feed

      "true" //pool against eth


    ], // Add your constructor arguments inside the array
    log: true,
    autoMine: true,
  });
  
  log(`🚀 TrailMix deployed to: ${deployedContract.address}`);
};

export default deployYourContract;
deployYourContract.tags = ["TrailMixManager"];


