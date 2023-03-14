const Quills = artifacts.require("Quills");

contract("Quills", accounts => {
    describe('ERC-721', async () => {
        it('has name of "Quills"', () =>
        Quills.deployed()
        .then(instance => instance.name())
        .then(name => {
            assert.equal(
            name.valueOf(),
            "Quills",
            "Quills wasn't the name of the NFT"
            );
        }));
    
        it('has symbol of "QuT"', () =>
        Quills.deployed()
        .then(instance => instance.symbol())
        .then(symbol => {
            assert.equal(
            symbol.valueOf(),
            "QuT",
            "QuT wasn't the symbol of the NFT"
            );
        }));
    })
})