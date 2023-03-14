const { time, BN, constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { assertion } = require('@openzeppelin/test-helpers/src/expectRevert');
const { ZERO_ADDRESS } = constants;
const Quills = artifacts.require("Quills");
const Nekoin = artifacts.require("Nekoin");
const NekoinReward = artifacts.require("NekoinReward");
const NekoinStaking = artifacts.require("NekoinStaking"); 
const Petition = artifacts.require("Petition"); 
const PetitionFactory = artifacts.require("PetitionFactory"); 

function token(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('PetitionFactory', function ([admin, nonStakeholder, stakeholderLvl1, stakeholderLvl2, stakeholderLvl3]) {
    const contractAddress = "0x81ee5fd4d78089c859ac5d1ef244e8421375bba3";
    const tokenId = 434
    beforeEach(async function () {
        // Contract deployment
        this.quills = await Quills.new();
        this.nekoin = await Nekoin.new();
        this.nekoinReward = await NekoinReward.new(this.nekoin.address);
        this.nekoinStaking = await NekoinStaking.new(this.nekoin.address, this.nekoinReward.address);
        this.petition = await Petition.new();
        this.petitionFactory = await PetitionFactory.new(this.petition.address, this.nekoinStaking.address, this.nekoin.address);

        await this.petitionFactory.grantRole(web3.utils.soliditySha3('VENDOR_ROLE'), admin, {from: admin});
        // Post deployement setup
        await this.nekoin.transfer(this.nekoinStaking.address, token('5000000000'), {from: admin});
        await this.nekoin.transfer(stakeholderLvl1, token('5000'), {from: admin});
        await this.nekoin.transfer(stakeholderLvl2, token('10000'), {from: admin});
        await this.nekoin.transfer(stakeholderLvl3, token('100000'), {from: admin});
        // stakeholderLvl1 (200 NEKO)
        await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: stakeholderLvl1});
        await this.nekoinStaking.createStake(token('100'), {from: stakeholderLvl1});
        await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: stakeholderLvl1});
        await this.nekoinStaking.createStake(token('100'), {from: stakeholderLvl1});
        // stakeholderLvl2 (10,000 NEKO)
        await this.nekoin.approve(this.nekoinStaking.address, token('5000'), {from: stakeholderLvl2});
        await this.nekoinStaking.createStake(token('5000'), {from: stakeholderLvl2});
        await this.nekoin.approve(this.nekoinStaking.address, token('5000'), {from: stakeholderLvl2});
        await this.nekoinStaking.createStake(token('5000'), {from: stakeholderLvl2});
        // stakeholderLvl3 (100,000 NEKO)
        await this.nekoin.approve(this.nekoinStaking.address, token('100000'), {from: stakeholderLvl3});
        await this.nekoinStaking.createStake(token('100000'), {from: stakeholderLvl3});
    });

    describe('Validations', function (){
        it('should revert on non stakeholder', async function () {
            await expectRevert(
                this.petitionFactory.createPetition(token('999999'), nonStakeholder, contractAddress, tokenId, {from: admin}),
                "PetitionFactory: Caller is not a StakeHolder"
            )
        })
    })

    describe('Creating Petitions', function () {
        it('should create level 1 petition', async function () {
            await this.petitionFactory.createPetition(token('999999'), stakeholderLvl1, contractAddress, tokenId, {from: admin});
            const petitions = await this.petitionFactory.getPetitions();
            const petitionLvl1 = await Petition.at(petitions[0]);
            const asking = await petitionLvl1.getAsking();
            const askingLimit = await petitionLvl1.getAskingLimit();
            const expireAt = await petitionLvl1.getExpireAt();
            const calculatedExpireAt = (await time.latest()).add(time.duration.days(30));

            assert.equal(asking, token('999999'));
            assert.equal(askingLimit, token('999999'));
            assert.equal(expireAt.toString(), calculatedExpireAt.toString());
        })

        it('should create level 2 petition', async function () {
            await this.petitionFactory.createPetition(token('999999999'), stakeholderLvl2, contractAddress, tokenId, {from: admin});
            const petitions = await this.petitionFactory.getPetitions();
            const petitionLvl2 = await Petition.at(petitions[0]);
            const asking = await petitionLvl2.getAsking();
            const askingLimit = await petitionLvl2.getAskingLimit();
            const expireAt = await petitionLvl2.getExpireAt();
            const calculatedExpireAt = (await time.latest()).add(time.duration.days(90));

            assert.equal(asking, token('999999999'));
            assert.equal(askingLimit, token('999999999'));
            assert.equal(expireAt.toString(), calculatedExpireAt.toString());
        })

        it('should create level 3 petition', async function () {
            await this.petitionFactory.createPetition(token('200000'), stakeholderLvl3, contractAddress, tokenId, {from: admin});
            const petitions = await this.petitionFactory.getPetitions();
            const petitionLvl2 = await Petition.at(petitions[0]);
            const asking = await petitionLvl2.getAsking();
            const askingLimit = await petitionLvl2.getAskingLimit();
            const expireAt = await petitionLvl2.getExpireAt();
            const calculatedExpireAt = (await time.latest()).add(time.duration.days(180));

            assert.equal(asking, token('200000'));
            assert.equal(askingLimit, token('10000000000'));
            assert.equal(expireAt.toString(), calculatedExpireAt.toString());
        })

        it('should create non monentary petition', async function () {
            await this.petitionFactory.createPetition(token('0'), stakeholderLvl3, contractAddress, tokenId, {from: admin});
            const petitions = await this.petitionFactory.getPetitions();
            const petitionLvl2 = await Petition.at(petitions[0]);
            const asking = await petitionLvl2.getAsking();
            const askingLimit = await petitionLvl2.getAskingLimit();
            const expireAt = await petitionLvl2.getExpireAt();
            const calculatedExpireAt = (await time.latest()).add(time.duration.days(180));

            assert.equal(asking, token('0'));
            assert.equal(askingLimit, token('10000000000'));
            assert.equal(expireAt.toString(), calculatedExpireAt.toString());
        })
    })
    
})