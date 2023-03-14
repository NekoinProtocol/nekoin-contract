// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CloneFactory.sol";
import "./Petition.sol";
import "./Staking.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PetitionFactory is CloneFactory, AccessControl {
    Petition[] public petitions; // Stores all petition addresses
    address private _admin;
    Staking private _staking;
    IBEP20 private _nekoin;
    address private _masterContract;
    bytes32 public constant VENDOR_ROLE = keccak256("VENDOR_ROLE");

    constructor(address masterContract, Staking staking, IBEP20 nekoin){
        _admin = msg.sender;
        _masterContract = masterContract;
        _staking = staking;
        _nekoin = nekoin;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    // create petition
    // check stake to validate asking againts limit
    // deploy petition contract

    function createPetition(uint256 asking, address petitioner, address NFTContract, uint256 tokenID) external {
        require(hasRole(VENDOR_ROLE, msg.sender), "Petition: Caller is not a vendor");
        require(_staking.hasStaked(petitioner), "PetitionFactory: Caller is not a StakeHolder");
        uint256 staked = _staking.getTotalStakeByStakeholder(petitioner);
        uint256 limit;
        uint256 expireAt;

        if(staked > 1000000000000000000 && staked <= 999000000000000000000) {
            //level 1
            limit = 999999000000000000000000;
            expireAt = block.timestamp + (30 * 1 days);
            require(asking <= limit, "PetitionFactory: asking exceeded asking limit");
        }

        else if(staked >= 1000000000000000000000 && staked <= 99999000000000000000000) {
            //level 2
            limit = 999999999000000000000000000;
            expireAt = block.timestamp + (90 * 1 days);
            require(asking <= limit, "PetitionFactory: asking exceeded asking limit");
        }

        else if(staked > 99999000000000000000000) {
            //level 3
            limit = 10000000000000000000000000000;
            expireAt = block.timestamp + (180 * 1 days);
            require(asking <= limit, "PetitionFactory: asking exceeded asking limit");
            
        }

        _deployPetition(petitioner, asking, limit, expireAt, NFTContract, tokenID);
    }

    function _deployPetition(address petitioner,uint256 asking, uint256 limit, uint256 expireAt, address NFTContract, uint256 tokenID) internal {
        Petition petition = Petition(createClone(_masterContract));
        petition.init(_admin, petitioner, asking, limit, expireAt, NFTContract, tokenID, _staking, _nekoin);
        petitions.push(petition);
    }

    function getPetitions() external view returns(Petition[] memory){
        return petitions;
    }
}
