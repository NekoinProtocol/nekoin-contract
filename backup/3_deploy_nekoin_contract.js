const Nekoin = artifacts.require("Nekoin");

module.exports = async function(deployer) {
    deployer.deploy(Nekoin, {overwrite: false});
}
