// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token/BEP20/BEP20.sol";
import "./token/BEP20/BEP20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract QuillToken is Ownable, BEP20, Pausable, BEP20Burnable {

    constructor() BEP20("Quill Token", "QUT") {
        _mint(msg.sender, 5000000000 * 10 ** decimals());
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}
