const {expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Nekoin = artifacts.require("Nekoin");
const Quills = artifacts.require("Quills");
const NekoinStaking = artifacts.require("NekoinStaking");
const NekoinPayment = artifacts.require("NekoinPayment");
const NekoinReward = artifacts.require("NekoinReward");
const NekoinRanking = artifacts.require("NekoinRanking");
const Petition = artifacts.require("Petition"); 
const PetitionFactory = artifacts.require("PetitionFactory"); 


function token(n) {
    return web3.utils.toWei(n, 'ether');
}
  
contract('NekoinRPayment', function ([admin, payer]) {
    const mintingFee = token('3.173');
    const metadataURI = 'bafybeieeomufuwkwf7sbhyo7yiifaiknm7cht5tc3vakn25vbvazyasp3u/metadata.json';
    const contractAddress = "0x81ee5fd4d78089c859ac5d1ef244e8421375bba3";
    const tokenId = 434

    beforeEach(async function () {
        this.nekoin = await Nekoin.new();
        this.quills = await Quills.new();
        this.nekoinReward = await NekoinReward.new(this.nekoin.address);
        this.nekoinStaking = await NekoinStaking.new(this.nekoin.address, this.nekoinReward.address);
        this.nekoinRanking = await NekoinRanking.new(
            admin,
            this.nekoin.address,
            this.quills.address,
            this.nekoinStaking.address,
        );
        this.petition = await Petition.new();
        this.petitionFactory = await PetitionFactory.new(this.petition.address, this.nekoinStaking.address, this.nekoin.address);

        this.nekoinPayment = await NekoinPayment.new(
            this.nekoin.address,
            this.quills.address,
            this.nekoinStaking.address,
            this.petitionFactory.address
        );
        
        await this.quills.grantRole(web3.utils.soliditySha3('MINTER_ROLE'), this.nekoinPayment.address, {from: admin});
        await this.petitionFactory.grantRole(web3.utils.soliditySha3('VENDOR_ROLE'), this.nekoinPayment.address, {from: admin});
        await this.nekoin.transfer(payer, token('5000'), {from: admin});
        this.admin_balance = await this.nekoin.balanceOf(admin);
    });

    describe('NFT Minting Pre-payment Validations', function () {
        it('should revert if the payer is not a stakeholder', async function () {
            await expectRevert(
                this.nekoinPayment.payMinting(metadataURI, {from: payer}),
                'NekoinPayment: Payer is not a StakeHolder'
            );
        });

        it('should revert on empty metadaURI', async function () {
            await expectRevert(
                this.nekoinPayment.payMinting('', {from: payer}),
                'NekoinPayment: Metadata URI is empty'
            );
        });
    });

    describe('NFT Minting Proccess Payment', function () {
        it('should accept 3.173 NEKO as minting fee', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            await this.nekoinPayment.payMinting(metadataURI, {from: payer});
            const payments = await this.nekoinPayment.getPayments();
        });

        it('emit a PaymentComplete event', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            const payMinting = await this.nekoinPayment.payMinting(metadataURI, {from: payer});
            expectEvent(
                payMinting, 
                'PaymentComplete', {
                    from: payer,
                    amount: mintingFee,
                    tokenID: '1',
                }
            );
        });

        it('should transfer NEKO from payer to admin wallet', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            await this.nekoinPayment.payMinting(metadataURI, {from: payer});
            const adminBalance = await this.nekoin.balanceOf(admin);
            assert.equal(
                adminBalance.toString(),
                '9999995003173000000000000000'
            ) 
        });

        it('should mint QuT payer waller', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            await this.nekoinPayment.payMinting(metadataURI, {from: payer});
            const payerQuillBalance = await this.quills.balanceOf(payer)
            assert.equal(
                payerQuillBalance.toString(),
                '1'
            ) 
        });
    });
    

    describe('Petition Minting Pre-payment Validations', function () {
        it('should revert if the payer is not a stakeholder', async function () {
            await expectRevert(
                this.nekoinPayment.payMintPetition(token('999999'), metadataURI, {from: payer}),
                'NekoinPayment: Payer is not a StakeHolder'
            );
        });

        it('should revert on empty metadaURI', async function () {
            await expectRevert(
                this.nekoinPayment.payMintPetition(token('999999'), '', {from: payer}),
                'NekoinPayment: Metadata URI is empty'
            );
        });
    });

    describe('Petition Minting Proccess Payment', function () {
        it('should accept 3.173 NEKO as minting fee', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            const test = await this.nekoinStaking.hasStaked(payer);
            await this.nekoinPayment.payMintPetition(token('999999'), metadataURI, {from: payer});
        });

        it('emit a PaymentComplete event', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            const payMinting = await this.nekoinPayment.payMintPetition(token('999999'), metadataURI, {from: payer});
            expectEvent(
                payMinting, 
                'PaymentComplete', {
                    from: payer,
                    amount: mintingFee,
                    tokenID: '1',
                }
            );
        });

        it('should transfer NEKO from payer to admin wallet', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            await this.nekoinPayment.payMintPetition(token('999999'), metadataURI, {from: payer});
            const adminBalance = await this.nekoin.balanceOf(admin);
            assert.equal(
                adminBalance.toString(),
                '9999995003173000000000000000'
            ) 
        });

        it('should mint QuT payer waller', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            await this.nekoinPayment.payMintPetition(token('999999'), metadataURI, {from: payer});
            const payerQuillBalance = await this.quills.balanceOf(payer)
            assert.equal(
                payerQuillBalance.toString(),
                '1'
            ) 
        });
    });

    describe('Petition Import Pre-payment Validations', function () {
        it('should revert if the payer is not a stakeholder', async function () {
            await expectRevert(
                this.nekoinPayment.payMintPetition(token('999999'), metadataURI, {from: payer}),
                'NekoinPayment: Payer is not a StakeHolder'
            );
        });

        it('should revert on empty metadaURI', async function () {
            await expectRevert(
                this.nekoinPayment.payMintPetition(token('999999'), '', {from: payer}),
                'NekoinPayment: Metadata URI is empty'
            );
        });
    });

    describe('Petition Import Proccess Payment', function () {
        it('should accept 3.173 NEKO as minting fee', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            const test = await this.nekoinStaking.hasStaked(payer);
            await this.nekoinPayment.payImportPetition(token('999999'), contractAddress, tokenId, {from: payer});
        });

        it('emit a PaymentComplete event', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            const payMinting = await this.nekoinPayment.payImportPetition(token('999999'), contractAddress, tokenId, {from: payer});
            expectEvent(
                payMinting, 
                'PaymentComplete', {
                    from: payer,
                    amount: mintingFee,
                    tokenID: tokenId.toString(),
                }
            );
        });

        it('should transfer NEKO from payer to admin wallet', async function () {
            await this.nekoin.approve(this.nekoinStaking.address, token('100'), {from: payer});
            await this.nekoinStaking.createStake(token('100'), {from: payer});
            await this.nekoin.approve(this.nekoinPayment.address, mintingFee, {from: payer});
            await this.nekoinPayment.payImportPetition(token('999999'), contractAddress, tokenId, {from: payer});
            const adminBalance = await this.nekoin.balanceOf(admin);
            assert.equal(
                adminBalance.toString(),
                '9999995003173000000000000000'
            ) 
        });
    });
})