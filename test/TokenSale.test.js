const {time, expectRevert } = require('@openzeppelin/test-helpers');
const QuillToken = artifacts.require("QuillToken");
const Nekoin = artifacts.require("Nekoin");
const TokenSale = artifacts.require("TokenSale");

function token(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('TokenSale', function ([admin, swapper]) {    
    
    beforeEach(async function() {

        this.quillsToken = await QuillToken.new();
        this.nekoin = await Nekoin.new();

        const _busdRate                   = 2500; // 1 QUT for 0.0004 ETH/BNB
        const _bnbRate                    = 1000000;
        const _purchaseLimit   = '25000000000000000000000000'; //wei
        this.tokenSale = await TokenSale.new(admin, this.quillsToken.address, this.nekoin.address, _busdRate, _bnbRate, _purchaseLimit, true);

        await this.quillsToken.transfer(this.tokenSale.address, token('500000000'), {from: admin});
    });

    it('should swap token', async function(){

        await this.tokenSale.purchaseFromBnb({from: swapper, value: token('0.000001')});
        result = await this.quillsToken.balanceOf(swapper);
        console.log('result', result.toString());
    })

})