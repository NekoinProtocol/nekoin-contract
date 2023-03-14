const Nekoin = artifacts.require("Nekoin");
const Quills = artifacts.require("Quills");
const Reward = artifacts.require("Reward");
const Payment = artifacts.require("Payment");
const Staking = artifacts.require("Staking");
const Petition = artifacts.require("Petition");
const PetitionFactory = artifacts.require("PetitionFactory");
const Ranking = artifacts.require("Ranking");

module.exports = async function(deployer) {

    await deployer.deploy(Quills);
    await deployer.deploy(Reward, Nekoin.address);
    await deployer.deploy(Staking, Nekoin.address, Reward.address);
    
    await deployer.deploy(Petition);
    await deployer.deploy(
        PetitionFactory, 
        Petition.address, 
        Staking.address,
        Nekoin.address
    );
    
    await deployer.deploy(
        Payment,  
        Nekoin.address,
        Quills.address,
        Staking.address,
        PetitionFactory.address
    );

    await deployer.deploy(Ranking, Nekoin.address, Staking.address, Payment.address);
}