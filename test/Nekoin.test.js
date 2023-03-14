const { BN } = require('@openzeppelin/test-helpers');
const Nekoin = artifacts.require("Nekoin");

contract('NEKO', function (accounts) {
    const [ initialHolder, recipient, anotherAccount ] = accounts;

    const name = 'Nekoin Token';
    const symbol = 'NEKO';
  
    beforeEach(async function () {
        this.token = await Nekoin.new();
    });

    it('has a name of "Nekoin Token"', async function () {
        expect(await this.token.name()).to.equal(name);
    });

    it('has a symbol "NEKO"', async function () {
        expect(await this.token.symbol()).to.equal(symbol);
    });

    it('has 18 decimals', async function () {
        expect((await this.token.decimals()).toString()).to.be.equal('18');
    });
    
})