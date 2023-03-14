const { time, BN, constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { inTransaction } = require('@openzeppelin/test-helpers/src/expectEvent');
const { assertion } = require('@openzeppelin/test-helpers/src/expectRevert');
const { ZERO_ADDRESS } = constants;
const Quills = artifacts.require("Quills");
const Nekoin = artifacts.require("Nekoin");
const NekoinReward = artifacts.require("NekoinReward");
const NekoinStaking = artifacts.require("NekoinStaking"); 
const Ranking = artifacts.require("Ranking"); 
const Petition = artifacts.require("Petition"); 
const PetitionFactory = artifacts.require("PetitionFactory"); 

function token(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('Petition', function ([admin, voter1, voter2, stakeholderLvl1]) {
    const contractAddress = "0x81ee5fd4d78089c859ac5d1ef244e8421375bba3";
    const tokenId = 434

    beforeEach(async function () {
        // Contract deployment
        this.nekoin = await Nekoin.new();
        this.quills = await Quills.new();
        this.nekoinReward = await NekoinReward.new(this.nekoin.address);
        this.nekoinStaking = await NekoinStaking.new(this.nekoin.address, this.nekoinReward.address);
        this.nekoinRanking = await Ranking.new(
            this.nekoin.address,
            this.quills.address,
            this.nekoinStaking.address,
        );
        this.petition = await Petition.new();
        this.petitionFactory = await PetitionFactory.new(this.petition.address, this.nekoinStaking.address, this.nekoin.address);
        
        await this.quills.grantRole(web3.utils.soliditySha3('MINTER_ROLE'), this.nekoinRanking.address, {from: admin});
        await this.petitionFactory.grantRole(web3.utils.soliditySha3('VENDOR_ROLE'), admin, {from: admin});
        await this.nekoin.transfer(this.nekoinStaking.address, token('5000000000'), {from: admin});
        await this.nekoin.transfer(voter1, token('5000'), {from: admin});
        await this.nekoin.transfer(voter2, token('5000'), {from: admin});
        await this.nekoin.transfer(stakeholderLvl1, token('5000'), {from: admin});
        await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: voter1});
        await this.nekoinStaking.createStake(token('100'), {from: voter1});
        await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: voter2});
        await this.nekoinStaking.createStake(token('100'), {from: voter2});
        await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: stakeholderLvl1});
        await this.nekoinStaking.createStake(token('100'), {from: stakeholderLvl1});
        // create petition
        await this.petitionFactory.createPetition(token('999999'), stakeholderLvl1, contractAddress, tokenId, {from: admin});
        this.petitions = await this.petitionFactory.getPetitions();
        this.petitionLvl1 = await Petition.at(this.petitions[0]);
    })

    describe('when petition is active', function () {
        it('should vote yes for the petition', async function () {
            await this.nekoin.approve(this.petitions[0], token('500'), {from: voter1});
            await this.petitionLvl1.vote(1, token('500'), {from: voter1});
            await this.nekoin.approve(this.petitions[0], token('0.2'), {from: voter2});
            await this.petitionLvl1.vote(1, token('0.2'), {from: voter2});
        })

        it('should revert on claiming tokens (voters)', async function () {
            await expectRevert(
                this.petitionLvl1.claimForVoters({from: voter1}),
                "Petition: Function cannot be called this time"
            )
        })

        it('should revert on claiming tokens(petitioner)', async function () {
            await expectRevert(
                this.petitionLvl1.claimForPetitioner({from: stakeholderLvl1}),
                "Petition: Function cannot be called this time"
            )
        })

        // it('could be cancelled by the petitioner', async function () {
        //     await this.petitionLvl1.cancelPetition({from: stakeholderLvl1});
        // })
    })

    describe('when petition expired', function () {
        it('should return latest results', async function () {
            await time.increase(time.duration.days(30));
            await this.petitionLvl1.getLatestResult();
        })

        it('should revert on voting', async function () {
            await time.increase(time.duration.days(30));
            await this.nekoin.approve(this.petitions[0], token('500'), {from: voter1});
            await expectRevert(
                this.petitionLvl1.vote(1, token('500'), {from: voter1}),
                "Petition: Petition is expired"
            )
        })

        before(async function () {
            await this.nekoin.approve(this.petitions[0], token('500'), {from: voter1});
            await this.petitionLvl1.vote(1, token('500'), {from: voter1});
        })

        it('should re-claim donated amount', async function () {
            await this.nekoin.approve(this.petitions[0], token('500'), {from: voter1});
            await this.petitionLvl1.vote(1, token('500'), {from: voter1});
            await time.increase(time.duration.days(31));
            await this.nekoin.approve(this.petitions[0], token('0.05'), {from: voter1});
            await this.petitionLvl1.claimForVoters({from: voter1});
        })

        it('should claim donated amount (Petitioner)', async function () {
            await this.nekoin.approve(this.petitions[0], token('500'), {from: voter1});
            await this.petitionLvl1.vote(1, token('500'), {from: voter1});
            await this.nekoin.approve(this.petitions[0], token('0.2'), {from: voter2});
            await this.petitionLvl1.vote(1, token('0.2'), {from: voter2});
            await time.increase(time.duration.days(38));
            await this.nekoin.approve(this.petitions[0], token('5.002'), {from: stakeholderLvl1});
            await this.petitionLvl1.claimForPetitioner({from: stakeholderLvl1});
        })
       
    })

    describe('when petition is cancelled', function () {
        it('should revert on voting', async function () {
            await this.petitionLvl1.cancelPetition({from: stakeholderLvl1});
            await this.nekoin.approve(this.petitions[0], token('500'), {from: voter1});
            await expectRevert(
                this.petitionLvl1.vote(1, token('500'), {from: voter1}),
                "Petition: Petition is cancelled"
            )
        })
    })
})