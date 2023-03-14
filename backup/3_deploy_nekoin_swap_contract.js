const QuillToken = artifacts.require("QuillToken");
const Nekoin = artifacts.require("Nekoin");
const Swap = artifacts.require("Swap");

module.exports = async function(deployer) {

  //Deploy Quill Token
  const quill = await QuillToken.deployed();

  // Deploy Nekoin
  await deployer.deploy(Nekoin);
  const nekoin = await Nekoin.deployed();

  await deployer.deploy(
    Swap,
    quill.address,
    nekoin.address,
    1624924800
  )
  
  return true;
}
