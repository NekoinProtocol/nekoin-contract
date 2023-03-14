// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token/BEP20/IBEP20.sol";
import "./utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./chainlink/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract TokenSale is ReentrancyGuard {
    using SafeMath for uint256;

    AggregatorV3Interface private _priceFeed;
    address payable private _wallet;
    address private _quill;
    address private _busd;
    address private _admin;
    uint256 private _rate;
    uint256 private _purchaseLimit;
    uint256 private _priceImpact;
    bool private _isActive;

    mapping(address => uint256) private _tokenPurchased;

    event TokensPurchased(address indexed purchaser, uint256 amount);

    constructor(
        address payable wallet,
        address quill, 
        address busd, 
        uint256 rate,
        uint256 purchaseLimit,
        bool isActive,
        address priceFeed,
        uint256 priceImpact
        ){
        require(rate > 0, "busdRate is 0");
        require(wallet != address(0), "wallet is the zero address");
        require(address(quill) != address(0), "quill is the zero address");
        require(address(busd) != address(0), "busd is the zero address");

        _wallet = wallet;
        _quill = quill;
        _busd = busd;
        _admin = msg.sender;
        _rate = rate;
        _purchaseLimit = purchaseLimit;
        _isActive = isActive;
        _priceFeed = AggregatorV3Interface(priceFeed);
        _priceImpact = priceImpact;
    }


    function getLatestPrice() public view returns (int) {
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = _priceFeed.latestRoundData();
        return price * 10 ** 10;
    }

    function getTokenPurchased(address purchasher) public view returns (uint256) {
        return _tokenPurchased[purchasher];
    }

    function getRate() public view returns (uint256) {
        return _rate;
    }

    function getPriceImpact() public view returns (uint256) {
        return _priceImpact;
    }

    function getPurchaseLimit() public view returns (uint256) {
        return _purchaseLimit;
    }

    function getStatus() public view returns (bool) {
        return _isActive;
    }

    function setRate(uint256 rate) external onlyOwner {
        _rate = rate;
    }

    function setPriceImpact(uint256 priceImpact) external onlyOwner {
        _priceImpact = priceImpact;
    }

    function setPurchaseLimit(uint256 purchaseLimit) external onlyOwner {
        _purchaseLimit = purchaseLimit;
    }

    function getBusd() public view returns (address) {
        return _busd;
    }

    function setBusd(address busd) external onlyOwner {
        _busd = busd;
    }

    function getQuill() public view returns (address) {
        return _quill;
    }

    function setQuill(address quill) external onlyOwner {
        _quill = quill;
    }
    
    function purchaseFromBnb(uint256 lastPrice) public whenActive nonReentrant payable {
        require(msg.sender != address(0), "wallet is the zero address");
        require(msg.value != 0, "Amount is 0");
        int256 lp = getLatestPrice();
        uint256 bnbInUsd = msg.value * SafeCast.toUint256(lp);
        uint256 token = bnbInUsd * _rate / 1000000000000000000;
        uint256 diff = SafeCast.toUint256(lp) - lastPrice;
        uint256 priceImpact = diff * 1000000000000000000 / lastPrice;
        require(priceImpact <= _priceImpact, "Price impact too high");
        require(_tokenPurchased[msg.sender].add(token) <= _purchaseLimit, "Individual cap exceeded");
        IBEP20(_quill).transfer(msg.sender, token);
        _tokenPurchased[msg.sender] = _tokenPurchased[msg.sender].add(token);
        _wallet.transfer(msg.value);
        emit TokensPurchased(msg.sender, token);
    }

    function purchaseFromBusd(uint256 busdAmount) external whenActive {
        // only if active
        require(msg.sender != address(0), "wallet is the zero address");
        require(busdAmount > 0, 'BUSD amount is zero');
        uint256 token = busdAmount * _rate;
        require(_tokenPurchased[msg.sender].add(token) <= _purchaseLimit, "Individual cap exceeded");
        IBEP20(_busd).transferFrom(msg.sender, _wallet, busdAmount);
        IBEP20(_quill).transfer(msg.sender, token);
        _tokenPurchased[msg.sender] = _tokenPurchased[msg.sender].add(token);
        emit TokensPurchased(msg.sender, token);
    }

    function activate() external onlyOwner {
        _isActive = true;
    }

    function deactivate() external onlyOwner {
        _isActive = false;
    }

    function withdraw() external onlyOwner whenInactive {
        uint256 quillBalance = IBEP20(_quill).balanceOf(address(this));
        IBEP20(_quill).transfer(_admin, quillBalance);
    }

    modifier onlyOwner {
        require(msg.sender == _admin, 'Caller is not the owner');
        _;
    }

    modifier whenActive {
        require(_isActive == true, 'Token Sale is not active');
        _;
    }

    modifier whenInactive {
        require(_isActive == false, 'Token Sale is active');
        _;
    }
}
