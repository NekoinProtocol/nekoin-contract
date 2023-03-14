const { balance, BN, constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { assertion } = require('@openzeppelin/test-helpers/src/expectRevert');
const { ZERO_ADDRESS } = constants;
const Nekoin = artifacts.require("Nekoin");
const Quills = artifacts.require("Quills");
const Reward = artifacts.require("Reward");
const Staking = artifacts.require("Staking");
const Petition = artifacts.require("Petition");
const PetitionFactory = artifacts.require("PetitionFactory");
const Payment = artifacts.require("Payment");
const Ranking = artifacts.require("Ranking");

function token(n) {
    return web3.utils.toWei(n, 'ether');
}

advanceTime = (time) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [time],
        id: new Date().getTime()
      }, (err, result) => {
        if (err) { return reject(err) }
        return resolve(result)
      })
    })
}

advanceBlock = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err) }
      const newBlockHash = web3.eth.getBlock('latest').hash

      return resolve(newBlockHash)
    })
  })
}

takeSnapshot = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_snapshot',
      id: new Date().getTime()
    }, (err, snapshotId) => {
      if (err) { return reject(err) }
      return resolve(snapshotId)
    })
  })
}

revertToSnapShot = (id) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_revert',
      params: [id],
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err) }
      return resolve(result)
    })
  })
}

advanceTimeAndBlock = async (time) => {
  await advanceTime(time)
  await advanceBlock()
  return Promise.resolve(web3.eth.getBlock('latest'))
}
  
contract('Ranking', function ([admin, payer, purchaser, voter]) {
    const mintingFee = token('3.173');
    const metadataURI = 'bafybeieeomufuwkwf7sbhyo7yiifaiknm7cht5tc3vakn25vbvazyasp3u/metadata.json';

    beforeEach(async function () {
        this.nekoin = await Nekoin.new();
        this.quills = await Quills.new();

        this.reward = await Reward.new(
          this.nekoin.address
        );

        this.staking = await Staking.new(
          this.nekoin.address,
          this.reward.address
        );

        this.petition = await Petition.new();

        this.petitionFactory = await PetitionFactory.new(
          this.petition.address,
          this.staking.address,
          this.nekoin.address
        );

        this.payment = await Payment.new(
          this.nekoin.address,
          this.quills.address,
          this.staking.address,
          this.petitionFactory.address
        );

        this.ranking = await Ranking.new(
          this.nekoin.address,
          this.staking.address,
          this.payment.address
        );
        
        await this.quills.grantRole(web3.utils.soliditySha3('MINTER_ROLE'), this.payment.address, {from: admin});
        await this.staking.grantRole(web3.utils.soliditySha3('VOTER_ROLE'), this.ranking.address, {from: admin});
        await this.reward.grantRole(web3.utils.soliditySha3('STAKEHOLDER_ROLE'), this.staking.address, {from: admin});
        await this.payment.grantRole(web3.utils.soliditySha3('PAYOR_ROLE'), this.ranking.address, {from: admin});
        await this.nekoin.transfer(this.reward.address, token('5000000000'), {from: admin});
        await this.nekoin.transfer(payer, token('5000'), {from: admin});
        await this.nekoin.transfer(voter, token('5000'), {from: admin});
    });

    describe('Pre-payment Validations', function () {
        it('should revert if the payer is not a stakeholder', async function () {
            await expectRevert(
                this.payment.payMinting(metadataURI, {from: payer}),
                'Payment: Payer is not a StakeHolder'
            );
        });

        it('should revert on empty metadaURI', async function () {
            await expectRevert(
                this.payment.payMinting('', {from: payer}),
                'Payment: Metadata URI is empty'
            );
        });
    });

    describe('Voting', async function(){
      it('should count the vote', async function(){

        let  receipt, tx, gasPrice;
        // Payer Stake
        await this.nekoin.approve(this.staking.address, token('100'), {from: payer});
        await this.staking.createStake(token('100'), {from: payer});

        // Payer Mint
        await this.nekoin.approve(this.payment.address, mintingFee, {from: payer});
        await this.payment.payMinting(metadataURI, {from: payer});

        // Voter Stake
        await this.nekoin.approve(this.staking.address, token('50'), {from: voter});
        await this.staking.createStake(token('50'), {from: voter});

        // Vote
        await this.nekoin.approve(this.ranking.address, token('10'), {from: voter});

        let snapShot, snapshotId;
        snapShot = await takeSnapshot();
        snapshotId = snapShot['result'];
        for(let c = 1; c<= 30; c++){
            await advanceTimeAndBlock(86400);
            receipt = await this.ranking.voteRanking(2, 1, {from: voter});
            // tx = await web3.eth.getTransaction(receipt.tx);
            // gasPrice = tx.gasPrice;
            // console.log(`GasPrice: ${tx.gasPrice}`);
        }
        result = await this.staking.getStake(2);
        assert.equal(result.vote.toString(), '30');

        result = await this.payment.getPayment(1);
        await revertToSnapShot(snapshotId);
      })
    })

    describe('Withdraw', async function(){
      it('should withdraw the stake', async function(){

        let  receipt, tx, gasPrice;
        // Payer Stake
        await this.nekoin.approve(this.staking.address, token('100'), {from: payer});
        await this.staking.createStake(token('100'), {from: payer});

        // Payer Mint
        await this.nekoin.approve(this.payment.address, mintingFee, {from: payer});
        await this.payment.payMinting(metadataURI, {from: payer});

        // Voter Stake
        await this.nekoin.approve(this.staking.address, token('50'), {from: voter});
        await this.staking.createStake(token('50'), {from: voter});

        // Vote
        await this.nekoin.approve(this.ranking.address, token('10'), {from: voter});

        let snapShot, snapshotId;
        snapShot = await takeSnapshot();
        snapshotId = snapShot['result'];
        for(let c = 1; c<= 30; c++){
            await advanceTimeAndBlock(86400);
            receipt = await this.ranking.voteRanking(2, 1, {from: voter});
            // tx = await web3.eth.getTransaction(receipt.tx);
            // gasPrice = tx.gasPrice;
            // console.log(`GasPrice: ${tx.gasPrice}`);
        }
        result = await this.staking.getStake(2);
        assert.equal(result.vote.toString(), '30');

        await this.staking.withdrawReward(2, { from: voter});

        result = await this.nekoin.balanceOf(voter);
        assert.equal(result.toString(), token('5004.25'));

        await revertToSnapShot(snapshotId);
      })
    })
})