// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './token/BEP20/IBEP20.sol';
import './QuillToken.sol';

contract Swap {
    QuillToken private _quill;
    IBEP20 private _nekoin;
    address private _admin;
    uint256 private _openingTime;
    uint256 private _closingTime;

    constructor(QuillToken quill, IBEP20 nekoin, uint256 openingTime){
        _quill = quill;
        _nekoin = nekoin;
        _admin = msg.sender;
        _openingTime = openingTime;
    }

    function swap(uint256 quillAmount) external whenActive {
        // only if active
        require(quillAmount > 0, 'Quill Amount is zero');
        _quill.transferFrom(msg.sender, address(this), quillAmount);
        _nekoin.transfer(msg.sender, quillAmount);
        _quill.burn(quillAmount);
    }

    modifier whenActive {
        require(block.timestamp >= _openingTime, 'Nekoin Swap is not active');
        _;
    }
}