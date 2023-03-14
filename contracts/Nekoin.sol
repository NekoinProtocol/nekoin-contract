// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token/BEP20/BEP20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Nekoin is Ownable, BEP20, Pausable {

    constructor() BEP20("Nekoin Token", "NEK") {
        _mint(msg.sender, 1000000000 * 10 ** decimals());
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