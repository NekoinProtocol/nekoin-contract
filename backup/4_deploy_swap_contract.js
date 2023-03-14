const QuillToken = artifacts.require("QuillToken");
const Nekoin = artifacts.require("Nekoin");
const TokenSale = artifacts.require("TokenSale");

module.exports = async function(deployer, networks, accounts) {
    const _rate                   = 2500; // 1 QUT for 0.0004 USD
    const _wallet                 = accounts[0];
    const _quill                  = QuillToken.address;
    const _purchaseLimit   = '25000000000000000000000000'; //wei

    await deployer.deploy(
        TokenSale,
        _wallet,
        _quill,
        '0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7',
        _rate,
        _purchaseLimit,
        true,
        '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    );
}
