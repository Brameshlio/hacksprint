const hre = require("hardhat");

async function main() {
  console.log("Deploying NutriChainProvenance contract...");

  const NutriChainProvenance = await hre.ethers.getContractFactory("NutriChainProvenance");
  const contract = await NutriChainProvenance.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("NutriChainProvenance deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
