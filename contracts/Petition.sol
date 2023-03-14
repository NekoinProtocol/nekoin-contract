// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Staking.sol";
import "./token/BEP20/SafeBEP20.sol";

contract Petition{
    using SafeBEP20 for IBEP20;
    enum Status {ACTIVE, CANCELLED, FULLFILLED, ENDED}
    address private _admin;
    address private _petitioner;
    uint256 private _askingPrice;
    uint256 private _askingLimit;
    uint256 private _expireAt;
    address private _tokenAddress;
    uint256 private _tokenID;
    bool private _isMonetary;
    Status private _status;
    Staking private _staking;
    IBEP20 private _nekoin;

    struct Voter {
        address voter;
        uint vote;
        bool voted;
        uint256 amount;
    }

    struct Options {
        string name; 
        uint256 voteSum;
        uint voteCount;
    }

    Options[] private options;
    Voter[] private voterList;

    mapping(address => Voter) public voters;

    event PetitionVoted(address voter, uint256 amount, uint option);
    event PetitionFulfilled(address petition_address);
    
    function init(address admin, address petitioner, uint256 asking, uint256 limit, uint256 expireAt, address NFTContract, uint256 tokenID, Staking staking, IBEP20 nekoin) external {
        _admin = admin;
        _petitioner = petitioner;
        _askingPrice = asking;
        _askingLimit = limit;
        _expireAt = expireAt;
        _tokenAddress = NFTContract;
        _tokenID = tokenID;
        _status = Status.ACTIVE;
        _staking = staking;
        _nekoin = nekoin;
        options.push(Options({
            name: "no",
            voteSum: 0,
            voteCount: 0
        }));
        options.push(Options({
            name: "yes",
            voteSum: 0,
            voteCount: 0
        }));
        if(_askingPrice > 0) {
            _isMonetary = true;
        } else {
            _isMonetary = false;
        }
    }

    function getAsking() external view returns (uint256) {
        return _askingPrice;
    }

    function getAskingLimit() external view returns (uint256) {
        return _askingLimit;
    }

    function getExpireAt() external view returns (uint256) {
        return _expireAt;
    }

    function getStatus() external view returns (Status) {
        return _status;
    }

    function cancelPetition() external {
        require(msg.sender == _petitioner, "Petition: Caller is not the petitioner");
        _status = Status.CANCELLED;
        _expireAt = block.timestamp;
    }

    function vote(uint option, uint256 amount) external {
        // check if stake holder
        // check petition if not expired
        // pick option and indicate the amount
        // check if asking is fullfilled
        // transfer the token to this contract
        require(_staking.hasStaked(msg.sender), "Petition: Caller is not a stakeholder");
        require(_status != Status.CANCELLED, "Petition: Petition is cancelled");
        require(block.timestamp < _expireAt, "Petition: Petition is expired");
        require(msg.sender != _petitioner, "Petition: petitioner is not allowed to vote on his own petition");

        if(options[1].voteSum + amount >= _askingPrice) {
            // count the vote and end the petition
            _writeVote(option, amount);
            _status = Status.FULLFILLED;
            _expireAt = block.timestamp;

            emit PetitionFulfilled(address(this));
        
        } else {
            _writeVote(option, amount);
            emit PetitionVoted(msg.sender, amount, option);
        }
    }

    function claimForVoters() external {
        //unfullfiled
        uint256 claimableUntil = _expireAt + (7 * 1 days);
        require(block.timestamp >= _expireAt && block.timestamp <= claimableUntil, "Petition: Function cannot be called this time");
        require(voters[msg.sender].voted, "Petition: Caller not a voter");
        require(_status != Status.FULLFILLED, "Petition: PEtition is FULFILLED");
        uint256 proccessFee = voters[msg.sender].amount / 10000;
        _nekoin.safeTransferFrom(msg.sender, _admin, proccessFee);
        _nekoin.transfer(msg.sender, voters[msg.sender].amount);
        options[1].voteSum -= voters[msg.sender].amount;
    }

    function claimForPetitioner() external {
        uint256 claimableFrom = _expireAt + (7 * 1 days);
        require(block.timestamp > claimableFrom, "Petition: Function cannot be called this time");
        require(msg.sender == _petitioner, "Petition: Caller not petitioner");
        require(_nekoin.balanceOf(address(this)) != 0, "Petition: 0 balance" );
        uint256 proccessFee = options[1].voteSum / 1000;
        // payment before transfer
        _nekoin.safeTransferFrom(msg.sender, _admin, proccessFee);
        _nekoin.transfer(_petitioner, options[1].voteSum);
    }

    function _writeVote(uint option, uint256 amount) internal {
        Voter storage sender = voters[msg.sender];
        
        if(!_isMonetary) {
            require(sender.amount == 0, "Petition: Petition is non-monetary");
        }

        require(!sender.voted, "Petition: Caller has already voted.");
        sender.voter = msg.sender;
        sender.voted = true;
        sender.vote = option;
        sender.amount = amount;
        voterList.push(sender);

        _nekoin.safeTransferFrom(msg.sender, address(this), amount);

        options[option].voteSum += sender.amount;
        options[option].voteCount++;
    }

    function getLatestResult() external view returns (Options[] memory) {
        return options;
    }

    function getVoters() external view returns (Voter[] memory) {
        return voterList;
    }

    function getPetioner() external view returns (address) {
        return _petitioner;
    }
}