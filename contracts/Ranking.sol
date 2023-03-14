// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token/BEP20/SafeBEP20.sol";
import "./Staking.sol";
import "./Payment.sol";
import '@openzeppelin/contracts/utils/Address.sol';

contract Ranking {
    using SafeBEP20 for IBEP20;
    using Address for address;

    IBEP20 private _nekoin;
    Staking private _staking;
    Payment private _payment;

    constructor(IBEP20 nekoin, Staking staking, Payment payment){
        _nekoin = nekoin;
        _staking = staking;
        _payment = payment;
    }

    function voteRanking(uint128 _stakeId, uint256 _paymentId) external{
        address _voter = msg.sender;
        require(_staking.hasStaked(_voter),  "Ranking: Voter is not a StakeHolder");
        
        (,, uint256 balance, uint vote,,,) = _staking.getStake(_stakeId);

        require(vote < 30, "Ranking: Available votes on this stake already completed" );

        (
           uint256 paymentId,
            address payor,
            address contractAddress,
            uint256 tokenId,
            ,
            ,
             
        ) = _payment.getPayment(_paymentId);

        bytes memory payload = abi.encodeWithSignature("ownerOf(uint256)", tokenId);
        bytes memory returnData = Address.functionCall(contractAddress, payload);
        (address _nftOwner) = abi.decode(returnData, (address));
        
        _nekoin.transferFrom(_voter, _nftOwner, balance * 5000000000000000000 / 10000000000000000000000);
        _staking.updateVote(_voter, _stakeId);
        _payment.updateRank(payor, paymentId);
    }

}