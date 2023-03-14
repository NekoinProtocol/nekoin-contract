const { balance, BN, constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Nekoin = artifacts.require("Nekoin");
const NekoinReward = artifacts.require("NekoinReward");

require('chai')
  .use(require('chai-as-promised'))
  .should()

function tokens(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('NekoinReward', function ([owner, investor1, , investor2, nonInvestor]) {
    let nekoin, nekoinReward;
    
    before(async () => {
        // Load Contracts
        nekoin = await Nekoin.new()
        nekoinReward = await NekoinReward.new(nekoin.address)
    
        // Transfer Nekoin tokens to Staking (5 Billion)
        await nekoin.transfer(nekoinReward.address, tokens('5000000000'))
    
    })
    
    describe('Nekoin deployment', async () => {
        it('has a name', async () => {
          const name = await nekoin.name()
          assert.equal(name, 'Nekoin Token')
        });
    });

    describe('Nekoin Reward deployment', async () => {
        it('contract has tokens', async () => {
          let balance = await nekoin.balanceOf(nekoinReward.address)
          assert.equal(balance.toString(), tokens('5000000000'))
        })
    })
})