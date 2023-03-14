// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token/BEP20/SafeBEP20.sol";
import "./Quills.sol";
import "./Staking.sol";
import "./PetitionFactory.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Payment is AccessControl{
    using SafeBEP20 for IBEP20;
    using Counters for Counters.Counter;
    Counters.Counter private _paymentIds;
    address _admin;
    IBEP20 private _nekoin;
    Staking private _staking;
    PetitionFactory private _petitionFactory;
    Quills private _quills;
    uint256 private _serviceFee;
    struct PaymentDetails {
        uint256 paymentId;
        address payor;
        address contractAddress;
        uint256 tokenId;
        uint128 rank;
        uint createdAt;
        uint updatedAt;
    }


    mapping(address => PaymentDetails[]) public payments;
    mapping(uint256 => address) public payors;

    event PaymentComplete(address indexed from, uint256 amount, uint256 tokenID);

    bytes32 public constant PAYOR_ROLE = keccak256("PAYOR_ROLE");

    constructor(IBEP20 nekoin_, Quills quills_, Staking staking_, PetitionFactory petitionFactory_){
        _admin = msg.sender;
        _nekoin = nekoin_;
        _quills = quills_;
        _petitionFactory = petitionFactory_;
        _staking = staking_;
        _serviceFee = 3173000000000000000;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function payMinting(string memory metadataURI) external returns (uint256 newTokenID){
        require(bytes(metadataURI).length > 0, "Payment: Metadata URI is empty");
        _pay(msg.sender);
        newTokenID = _quills.mintToken(msg.sender, metadataURI);
        _addToPayments(msg.sender, address(_quills), newTokenID);
        emit PaymentComplete(msg.sender, _serviceFee, newTokenID);
    }

    function payMintPetition(uint256 asking, string memory metadataURI) external returns (uint256 newTokenID){
        require(bytes(metadataURI).length > 0, "Payment: Metadata URI is empty");
        _pay(msg.sender);
        newTokenID = _quills.mintToken(msg.sender, metadataURI);
        _addToPayments(msg.sender, address(_quills), newTokenID);
        _petitionFactory.createPetition(asking, msg.sender, address(_quills), newTokenID);
        emit PaymentComplete(msg.sender, _serviceFee, newTokenID);
    }

    function payImportPetition(uint256 asking, address tokenContract, uint256 tokenID) external {
        _pay(msg.sender);
        _petitionFactory.createPetition(asking, msg.sender, tokenContract, tokenID);
        _addToPayments(msg.sender, tokenContract, tokenID);
        emit PaymentComplete(msg.sender, _serviceFee, tokenID);
    }

    function _pay(address payer) internal {
        require(payer != address(0), "Payment: Payer is the zero address");
        require(_staking.hasStaked(payer),  "Payment: Payer is not a StakeHolder");
        _nekoin.safeTransferFrom(payer, _admin, _serviceFee);
    }

    function _addToPayments(address payor, address _contractAddress, uint256 tokenId) internal {
        _paymentIds.increment();
        uint256 id = _paymentIds.current();
        PaymentDetails memory payment = PaymentDetails(
            id,
            payor,
            _contractAddress,
            tokenId,
            uint128(0),
            uint(block.timestamp),
            uint(block.timestamp)
        );
        
        payments[payor].push(payment);
        payors[id] = payor;
    }

    function getPayment(uint256 _paymentId) 
        public 
        view
        returns(
            uint256 paymentId,
            address payor,
            address contractAddress,
            uint256 tokenId,
            uint128 rank,
            uint createdAt,
            uint updatedAt
        ){

        address _payor = payors[_paymentId];
        for(uint256 c = 0; c < payments[_payor].length; c++){
            if(payments[_payor][c].paymentId== _paymentId){
                PaymentDetails memory p = payments[_payor][c];
                return (
                    p.paymentId, 
                    p.payor,
                    p.contractAddress, 
                    p.tokenId, 
                    p.rank, 
                    p.createdAt, 
                    p.updatedAt
                );
            }
        }

        require(false, 'Payment: Payment Not found');
    } 

    function getPaymentIds() 
        external
        view returns(uint256 paymentIds){
        return _paymentIds.current();
    }

    function updateRank(address _payor, uint256 _paymentId) external{

        require(hasRole(PAYOR_ROLE, msg.sender), "Payment: Caller is not a payor");
        
        (,,,,uint128 rank,,) = getPayment(_paymentId);
        for(uint256 c = 0; c < payments[_payor].length; c++){
            if(payments[_payor][c].paymentId == _paymentId){
                payments[_payor][c].rank = rank + 1;
                payments[_payor][c].updatedAt = uint(block.timestamp);
                break;
            }
        }
    }
}