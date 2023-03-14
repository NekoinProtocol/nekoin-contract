// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Nekoin.sol";
import "./Reward.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Staking is AccessControl {
    using SafeMath for uint256;
    
    Nekoin public nekoin;
    Reward public reward;

    struct Stake {
        uint128 stakeId;
        address stakeholder;
        uint256 balance;
        uint vote;
        uint createdAt;
        uint updatedAt;
    }

    mapping(address => Stake[]) private stakes;
    address[] public stakeholders;
    mapping(address => uint256) public totalStakes;
    mapping(address => bool) public isStakeholder;
    mapping(uint128 => address) public stakeOwner;
    uint128 public stakeIdCounter;

    bytes32 public constant VOTER_ROLE = keccak256("VOTER_ROLE");

    constructor(Nekoin nekoin_, Reward reward_)
    { 
        nekoin = nekoin_;
        reward = reward_;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    } 

    // ---------- STAKES ----------

    function createStake(uint256 _stakeAmount) public {

        require(_stakeAmount > 0, "Staking: Stake amount cannot be 0");
        require(_stakeAmount >= 1000000000000000000, "Staking: Stake amount must be greater than 1");
        require(_stakeAmount % 1000000000000000000== 0, "Staking: Stake amount must be whole number");

        address _stakeholder = msg.sender;

        nekoin.transferFrom(_stakeholder, address(this), _stakeAmount);

        
        stakeIdCounter++;
        uint _vote = 0;

        totalStakes[_stakeholder] = totalStakes[_stakeholder].add(_stakeAmount);
        
        Stake memory stake = Stake(
            stakeIdCounter,
            _stakeholder, 
            _stakeAmount, 
            _vote, 
            uint(block.timestamp), 
            uint(block.timestamp)
        );

        stakes[_stakeholder].push(stake);
        stakeOwner[stakeIdCounter] = _stakeholder;
        addStakeholder(_stakeholder);
    }
    
    function stakeOf(address _stakeholder) 
        public 
        view 
        returns(Stake[] memory){
        require(hasStaked(_stakeholder), "Staking: No staking");
        return stakes[_stakeholder];
    }

    function getStake(uint128 _stakeId) 
        public 
        view 
        returns(
            uint128 stakeId,
            address stakeholder,
            uint256 balance,
            uint vote,
            uint createdAt,
            uint updatedAt,
            uint index
        ){

        address _stakeholder = stakeOwner[_stakeId];
        for(uint256 c = 0; c < stakes[_stakeholder].length; c++){
            if(stakes[_stakeholder][c].stakeId == _stakeId){
                Stake memory s = stakes[_stakeholder][c];
                return (
                    s.stakeId, 
                    s.stakeholder, 
                    s.balance, 
                    s.vote, 
                    s.createdAt, 
                    s.updatedAt,
                    c
                );
            }
        }
        require(false, "Staking: Stake not found.");
    }


    // ---------- STAKEHOLDERS ----------

    
    function addStakeholder(address _stakeholder)
        private
    {
        if(!isStakeholder[_stakeholder]){
            stakeholders.push(_stakeholder);
            isStakeholder[_stakeholder] = true;
        }
    }

    function removeStakeholder(address _stakeholder)
        private
    {
        // isStakeholder[_stakeholder] = false;
        if(!hasStaked(_stakeholder)){
            for(uint256 c = 0; c < stakeholders.length; c += 1){

                if(stakeholders[c] == _stakeholder){
                    delete stakeholders[c];
                }
            }
            isStakeholder[_stakeholder] = false;
        }
        
    }

    function getStakeholders() 
        public
        view
        returns(address[] memory){
            return stakeholders;
    }

    function hasStaked(address _stakeholder) 
        public
        view
        returns (bool)
        {
        return stakes[_stakeholder].length > 0;
    }

    function getTotalStakeByStakeholder(address stakeholder) external view returns (uint256) {
        return totalStakes[stakeholder];
    }

   
    // ---------- VOTE ----------
    function updateVote(address _stakeholder, uint128 _stakeId) public {
        
        require(hasRole(VOTER_ROLE, msg.sender), "Staking: Caller is not a voter");
        
        (,,,uint vote,,uint updatedAt,)= getStake(_stakeId);

        require(uint(block.timestamp) >= updatedAt + 86400, 'Staking: Not time for voting');
        require(vote < 30, 'Staking: Already done voting');

        for(uint256 c = 0; c < stakes[_stakeholder].length; c ++){
            if(stakes[_stakeholder][c].stakeId == _stakeId){
                stakes[_stakeholder][c].vote = vote + 1;
                stakes[_stakeholder][c].updatedAt = uint(block.timestamp);
                break;
            }
        }
    }


    // ---------- REWARD ----------
    function withdrawReward(uint128 _stakeId) public {
        (,address stakeholder,uint256 balance, uint vote,,,uint index) = getStake(_stakeId);

        require(stakeholder == msg.sender, "Staking: Invalid withdraw");
        require(vote >= 30, "Staking: Not enough vote to withdraw");
        uint256 _rewardAmount = balance * 1000000000000000000000 / 10000000000000000000000;
        nekoin.transfer(stakeholder, balance);
        reward.createReward(stakeholder, _stakeId, _rewardAmount);

        totalStakes[stakeholder] = totalStakes[stakeholder].sub(balance);
        removeStake(stakeholder, index);
        removeStakeholder(stakeholder);
    }

    function removeStake (address _stakeholder, uint index) private {

        require(_stakeholder == msg.sender, 'Staking: Invalid voter');

        Stake memory s = stakes[_stakeholder][index];
        stakes[_stakeholder][index] = stakes[_stakeholder][stakes[_stakeholder].length - 1];
        stakes[_stakeholder].pop();
        delete stakeOwner[s.stakeId];
    }
}