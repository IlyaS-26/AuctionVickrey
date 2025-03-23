// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AuctionVickrey is Ownable {

    constructor() Ownable(msg.sender) {}

    event auctionIsCreated(uint256 _auctionId, uint256 _startTime, uint256 _revealTime, uint256 _endTime);
    event userReceivedRefund(address userAddress, uint256 funds);

    error auctionAlreadyExist();
    error incorrectTimeLine();
    error auctionIsntExist();
    error auctionIsEnded();
    error auctionIsOnRevealPhase();
    error invalidHashedBid();
    error notEnoughFunds();
    error refundFailed();
    error auctionInProgress();

    struct Auction {
        //@notice user's address => hash of user's bid (keccak256(ammount, secretPhrase))
        mapping(address => bytes32) hashedBids;
        //@notice user's address => revealed bid
        mapping(address => uint256) bids;
        //@notice user's address => total user sended funds
        mapping(address => uint256) userFunds;

        address currentWinner;

        uint256 auctionId;
        uint256 startTime;
        uint256 revealTime;
        uint256 endTime;
        uint256 maxBid;
        uint256 preMaxBid;
        
        bool isExist;
    }

    mapping(uint256 => Auction) private auctions;

    function createAuction(uint256 _auctionId, uint256 _revealTime, uint256 _endTime) external onlyOwner {
        Auction storage auctionInstance = auctions[_auctionId];
        require(_endTime > _revealTime, incorrectTimeLine());
        require(auctionInstance.isExist == false, auctionAlreadyExist());
        auctionInstance.startTime = block.timestamp;
        auctionInstance.revealTime = block.timestamp + _revealTime;
        auctionInstance.endTime = block.timestamp + _endTime;
        auctionInstance.isExist = true;
        auctionInstance.auctionId = _auctionId;
        emit auctionIsCreated(_auctionId, auctionInstance.startTime, _revealTime, _endTime);
    }

    function setBid(uint256 _auctionId, bytes32 hashedBid) external payable {
        Auction storage auctionInstance = auctions[_auctionId];
        require(auctionInstance.isExist == true, auctionIsntExist());
        require(block.timestamp < auctionInstance.endTime, auctionIsEnded());
        require(block.timestamp < auctionInstance.revealTime, auctionIsOnRevealPhase());
        auctionInstance.hashedBids[msg.sender] = hashedBid;
        auctionInstance.userFunds[msg.sender] = msg.value;
    }

    function revealBid(uint256 _auctionId, uint256 bidAmmount, string calldata secretPhrase) external {
        Auction storage auctionInstance = auctions[_auctionId];
        require(block.timestamp < auctionInstance.endTime, auctionIsEnded());
        require(auctionInstance.hashedBids[msg.sender] == keccak256(abi.encodePacked(bidAmmount, secretPhrase)), invalidHashedBid());
        require(auctionInstance.userFunds[msg.sender] >= bidAmmount, notEnoughFunds());
        auctionInstance.bids[msg.sender] = bidAmmount;
        if (bidAmmount > auctionInstance.maxBid) {
            auctionInstance.maxBid = bidAmmount;
            auctionInstance.preMaxBid = auctionInstance.maxBid;
            auctionInstance.currentWinner = msg.sender;
        }
    }

    function refundBid(uint256 _auctionId) external {
        Auction storage auctionInstance = auctions[_auctionId];
        require(block.timestamp > auctionInstance.endTime, auctionInProgress());
        if (msg.sender == auctionInstance.currentWinner) {
            (bool success, ) = payable(msg.sender).call{value: auctionInstance.userFunds[msg.sender] - auctionInstance.preMaxBid}("");
            require(success, refundFailed());
            emit userReceivedRefund(msg.sender, auctionInstance.userFunds[msg.sender] - auctionInstance.preMaxBid);
        } else {
            (bool success, ) = payable(msg.sender).call{value: auctionInstance.userFunds[msg.sender]}("");
            require(success, refundFailed());
            emit userReceivedRefund(msg.sender, auctionInstance.userFunds[msg.sender]);
        }
    }

    function getWinner(uint256 _auctionId) external view returns (address) {
        Auction storage auctionInstance = auctions[_auctionId];
        require(block.timestamp > auctionInstance.endTime, auctionInProgress());
        return auctionInstance.currentWinner;
    }

}