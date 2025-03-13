// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AuctionVickrey is Ownable {

    constructor() Ownable(msg.sender) {}

    event auctionIsCreated(uint256 _auctionId, uint256 _startTime, uint256 _revealTime, uint256 _endTime);

    error auctionAlreadyExist();
    error incorrectTimeLine();

    struct Auction {
        //@notice user's address => hash of user's bid (keccak256(ammount, secretPhrase))
        mapping(address => bytes32) hashedBids;
        //@notice user's address => revealed bid
        mapping(address => uint256) bids;

        uint256 auctionId;
        uint256 startTime;
        uint256 revealTime;
        uint256 endTime;
        
        bool isExist;
        bool isAuctionEnded;
    }

    mapping(uint256 => Auction) private auctions;

    function createAuction(uint256 _auctionId, uint256 _revealTime, uint256 _endTime) external onlyOwner {
        require(_endTime > _revealTime, incorrectTimeLine());
        require(auctions[_auctionId].isExist == false, auctionAlreadyExist());
        Auction storage auctionInstance = auctions[_auctionId];
        auctionInstance.startTime = block.timestamp;
        auctionInstance.revealTime = block.timestamp + _revealTime;
        auctionInstance.endTime = block.timestamp + _endTime;
        auctionInstance.isExist = true;
        emit auctionIsCreated(_auctionId, auctionInstance.startTime, _revealTime, _endTime);
    }

    function setBid() external {}

    function revealBid() external {}

    function refundBid() external {}

}