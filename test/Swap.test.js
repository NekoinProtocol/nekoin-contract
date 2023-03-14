const {time, expectRevert } = require('@openzeppelin/test-helpers');
const Nekoin = artifacts.require("Nekoin");
const QuillToken = artifacts.require("QuillToken");
const Swap = artifacts.require("Swap");

function token(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('Swap', function ([admin, swapper]) {    
    beforeEach(async function() {
        const openTime = (await time.latest()).add(time.duration.days(1));
        this.nekoin = await Nekoin.new();
        this.quillsToken = await QuillToken.new();
        this.swap = await Swap.new(
            this.quillsToken.address,
            this.nekoin.address,
            openTime
        );

        await this.nekoin.transfer(this.swap.address, token('5000000000'), {from: admin});
        await this.quillsToken.transfer(swapper, token('1000'), {from: admin});
    })

    it('should revert on zero amount', async function(){
        await time.increase(time.duration.days(1));
        await this.quillsToken.approve(this.swap.address, token('1000'), {from: swapper});
        await expectRevert(
            this.swap.swap(token('0'), {from: swapper}),
            "Quill Amount is zero"
        )
    })
    it('should revert if token swap is not open', async function(){
        await this.quillsToken.approve(this.swap.address, token('1000'), {from: swapper});
        await expectRevert(
            this.swap.swap(token('0'), {from: swapper}),
            "Nekoin Swap is not active"
        )
    })
    it('should swap token', async function(){
        await time.increase(time.duration.days(1));
        await this.quillsToken.approve(this.swap.address, token('1000'), {from: swapper});
        await this.swap.swap(token('1000'), {from: swapper});
        assert.equal(
            await this.nekoin.balanceOf(swapper),
            token('1000')
        );
        assert.equal(
            await this.quillsToken.balanceOf(swapper),
            token('0')
        );
    })

})