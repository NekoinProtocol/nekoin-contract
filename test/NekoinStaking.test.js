const { balance, BN, constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Nekoin = artifacts.require("Nekoin");
const NekoinStaking = artifacts.require("NekoinStaking");
const NekoinReward = artifacts.require("NekoinReward");

require('chai')
  .use(require('chai-as-promised'))
  .should()

function tokens(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('Staking', function ([owner, investor1, , investor2, nonInvestor]) {
    let nekoin, nekoinStaking, nekoinReward;
    
    before(async () => {
        // Load Contracts
        nekoin = await Nekoin.new()
        nekoinReward = await NekoinReward.new(nekoin.address);
        nekoinStaking = await NekoinStaking.new(nekoin.address, nekoinReward.address);
    
        // Transfer Nekoin tokens to Staking (5 Billion)
        await nekoin.transfer(nekoinReward.address, tokens('5000000000'))
    
        // Send tokens to investor
        await nekoin.transfer(investor1, tokens('100'), { from: owner })
        await nekoin.transfer(investor2, tokens('100'), { from: owner })
    })
    
    describe('Nekoin deployment', async () => {
        it('has a name', async () => {
          const name = await nekoin.name()
          assert.equal(name, 'Nekoin Token')
        });
    });

    describe('Reward deployment', async () => {
        it('contract has tokens', async () => {
          let balance = await nekoin.balanceOf(nekoinReward.address)
          assert.equal(balance.toString(), tokens('5000000000'))
        })
    })

    describe('createStake', async () => { 
        it('requires a Nekoin Token balance equal or above the stake.', async () => {   
         
          await expectRevert(
            nekoinStaking.createStake(0, { from: nonInvestor }), 'NekoinStaking: Stake amount cannot be 0'
          );
          
          await expectRevert(
            nekoinStaking.createStake(1, { from: nonInvestor }), 'ERC20: transfer amount exceeds balance'
          );
        });
      
        it('stake by mulitple investors', async () => {
          let result
    
          // Check investor balance before staking
          result = await nekoin.balanceOf(investor1)
          assert.equal(result.toString(), tokens('100'), 'investor 1 Nekoin wallet balance correct before staking')

          result = await nekoin.balanceOf(investor2)
          assert.equal(result.toString(), tokens('100'), 'investor 2 Nekoin wallet balance correct before staking')
    
          // Stake Nekoin Tokens from Investor 1
          await nekoin.approve(nekoinStaking.address, tokens('100'), { from: investor1 })
          await nekoinStaking.createStake(tokens('50'), { from: investor1 })

          // Stake Nekoin Tokens from Investor 2
          await nekoin.approve(nekoinStaking.address, tokens('100'), { from: investor2 })
          await nekoinStaking.createStake(tokens('50'), { from: investor2 })
   
          // Check staking result from Investor 1
          result = await nekoin.balanceOf(investor1)
          assert.equal(result.toString(), tokens('50'), 'investor Nekoin wallet balance correct after staking')

          // Check staking result from Investor 2
          result = await nekoin.balanceOf(investor2)
          assert.equal(result.toString(), tokens('50'), 'investor Nekoin wallet balance correct after staking');
    
          // Check total nekoinStaking balance after createStake
          result = await nekoin.balanceOf(nekoinStaking.address)
          assert.equal(result.toString(), tokens('100'), 'Nekoin Stake balance correct after staking');
    
          // Check stakeOf investors
          result = await nekoinStaking.stakeOf(investor1);
          assert.equal(result[0].balance.toString(), tokens('50'), 'investor 1 staking balance correct after staking');


          // result = await nekoinStaking.getStake(1);
          // assert.equal(result[0].balance.toString(), tokens('50'), 'investor 1 staking balance correct after staking');

          result = await nekoinStaking.stakeOf(investor2);
          assert.equal(result[0].balance.toString(), tokens('50'), 'investor 2 staking balance correct after staking');
          
          // Check hasStaked status
          result = await nekoinStaking.hasStaked(investor1)
          assert.equal(result.toString(), 'true', 'investor 1 hasStaked status correct after staking');

          result = await nekoinStaking.hasStaked(investor2)
          assert.equal(result.toString(), 'true', 'investor 1 hasStaked status correct after staking');
          
          result = await nekoinStaking.hasStaked(nonInvestor)
          assert.equal(result.toString(), 'false', 'noninvestor hasStakedstatus correct after staking');

          // Check isStakeholder status
          result = await nekoinStaking.isStakeholder(investor1)
          assert.equal(result.toString(), 'true', 'investor 1 isStakeholder status correct after staking');

          result = await nekoinStaking.isStakeholder(investor2)
          assert.equal(result.toString(), 'true', 'investor 1 isStakeholder status correct after staking');
          
          result = await nekoinStaking.isStakeholder(nonInvestor)
          assert.equal(result.toString(), 'false', 'noninvestor isStakeholderstatus correct after staking');

          // Check investors included in stakeholders list
          result = await nekoinStaking.getStakeholders();
          expect(result).to.include.members([investor1, investor2])
    
        })
    });
})