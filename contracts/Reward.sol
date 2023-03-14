// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Nekoin.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Reward is AccessControl {
    
    mapping(address => uint256) internal totalRewards;

    Nekoin public nekoin;

    bytes32 public constant STAKEHOLDER_ROLE = keccak256("STAKEHOLDER_ROLE");

    struct RewardDetails{
        address stakeholder;
        uint256 reward;
        uint stakeId;
        uint createdAt;
    }

    mapping(address => RewardDetails[]) internal stakeholderRewards;

    constructor(Nekoin nekoin_){
        nekoin = nekoin_;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    function createReward(address _stakeholder, uint _stakeId, uint256 _reward) public {
        require(hasRole(STAKEHOLDER_ROLE, msg.sender), "Reward: Caller is not a voter");

        nekoin.transfer(_stakeholder, _reward);
        RewardDetails memory r = RewardDetails(
            _stakeholder,
            _reward,
            _stakeId,
            uint(block.timestamp)
        );
    
        stakeholderRewards[_stakeholder].push(r);
    }

    function getTotalRewards(address _stakeholder) 
        public
        view
        returns(uint256)
    {
        return totalRewards[_stakeholder];
    }

    function rewardOf(address _stakeholder) 
        public 
        view
        returns (RewardDetails[] memory){

        return stakeholderRewards[_stakeholder];
    }


}