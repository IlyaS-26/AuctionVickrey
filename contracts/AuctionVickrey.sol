// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AuctionVickrey is Ownable {
    constructor() Ownable(msg.sender) {}

    event auctionIsCreated(
        uint256 _auctionId,
        uint256 _startTime,
        uint256 _revealTime,
        uint256 _endTime
    );
    event userReceivedRefund(address userAddress, uint256 funds);
    event auctionEnded(uint256 _auctionId);

    error auctionAlreadyExist();
    error incorrectTimeLine();
    error auctionIsntExist();
    error auctionIsEnded();
    error auctionIsOnRevealPhase();
    error invalidHashedBid();
    error notEnoughFunds();
    error refundFailed();
    error auctionInProgress();
    error auctionIsNotExist();
    error userAlreadyMadeBid();
    error revealPhaseNotYet();
    error userNotParticipate();
    error userNothingToRefund();

    //Добавить withdraw по id аукциона и добавить маппинг

    struct Auction {
        //@notice user's address => hash of user's bid (keccak256(ammount, secretPhrase))
        mapping(address => bytes32) hashedBids;
        //@notice user's address => revealed bid
        mapping(address => uint256) bids;
        //@notice user's address => total user sended funds
        mapping(address => uint256) userFunds;
        //@notice is user participate in auction
        mapping(address => bool) participation;

        address currentWinner;

        uint256 startTime;
        uint256 revealTime;
        uint256 endTime;
        uint256 maxBid;
        uint256 preMaxBid;

        bool isExist;
        bool isEnded;
    }

    mapping(uint256 => Auction) internal auctions;

    function createAuction(
        uint256 _auctionId,
        uint256 _revealTime,
        uint256 _endTime
    ) external onlyOwner {
        Auction storage auctionInstance = auctions[_auctionId];
        require(_endTime > _revealTime, incorrectTimeLine());
        require(auctionInstance.isExist == false, auctionAlreadyExist());
        auctionInstance.startTime = block.timestamp;
        auctionInstance.revealTime = block.timestamp + _revealTime;
        auctionInstance.endTime = block.timestamp + _endTime;
        auctionInstance.isExist = true;
        emit auctionIsCreated(
            _auctionId,
            auctionInstance.startTime,
            _revealTime,
            _endTime
        );
    }

    function setBid(uint256 _auctionId, bytes32 hashedBid) external payable {
        Auction storage auctionInstance = auctions[_auctionId];
        require(auctionInstance.isExist == true, auctionIsntExist());
        require(block.timestamp < auctionInstance.endTime, auctionIsEnded());
        require(block.timestamp < auctionInstance.revealTime,auctionIsOnRevealPhase());
        require(!auctionInstance.participation[msg.sender], userAlreadyMadeBid());
        auctionInstance.participation[msg.sender] = true;
        auctionInstance.hashedBids[msg.sender] = hashedBid;
        auctionInstance.userFunds[msg.sender] = msg.value;
    }

    function revealBid(
        uint256 _auctionId,
        uint256 bidAmmount,
        string calldata secretPhrase
    ) external {
        Auction storage auctionInstance = auctions[_auctionId];
        require(block.timestamp > auctionInstance.revealTime, revealPhaseNotYet());
        require(block.timestamp < auctionInstance.endTime, auctionIsEnded());
        require(auctionInstance.hashedBids[msg.sender] == keccak256(abi.encodePacked(bidAmmount, secretPhrase)), invalidHashedBid());
        require(auctionInstance.userFunds[msg.sender] >= bidAmmount, notEnoughFunds());
        auctionInstance.bids[msg.sender] = bidAmmount;
        if(bidAmmount > auctionInstance.preMaxBid) {
            if (bidAmmount > auctionInstance.maxBid) {
                auctionInstance.preMaxBid = auctionInstance.maxBid;
                auctionInstance.maxBid = bidAmmount;
                auctionInstance.currentWinner = msg.sender;
            } else {
                auctionInstance.preMaxBid = bidAmmount;
            }
        }
    }

    function refundBid(uint256 _auctionId) external {
        Auction storage auctionInstance = auctions[_auctionId];
        require(auctionInstance.participation[msg.sender], userNotParticipate());
        require(block.timestamp > auctionInstance.endTime, auctionInProgress());
        require(auctionInstance.userFunds[msg.sender] > 0, userNothingToRefund());
        uint256 funds = auctionInstance.userFunds[msg.sender];
        auctionInstance.userFunds[msg.sender] = 0;
        if (msg.sender == auctionInstance.currentWinner) {
            (bool success, ) = payable(msg.sender).call{ value: funds - auctionInstance.preMaxBid }("");
            require(success, refundFailed());
            emit userReceivedRefund(
                msg.sender,
                funds - auctionInstance.preMaxBid
            );
        } else {
            (bool success, ) = payable(msg.sender).call{ value: funds }("");
            require(success, refundFailed());
            emit userReceivedRefund(
                msg.sender,
                funds
            );
        }
    }

    function getWinner(uint256 _auctionId) external view returns(address) {
        Auction storage auctionInstance = auctions[_auctionId];
        require(block.timestamp > auctionInstance.endTime, auctionInProgress());
        return auctionInstance.currentWinner;
    }

    function isEnded(uint256 _auctionId) external returns(bool) {
        Auction storage auctionInstance = auctions[_auctionId];
        require(block.timestamp > auctionInstance.endTime, auctionInProgress());
        auctionInstance.isEnded = true;
        emit auctionEnded(
            _auctionId
        );
        return true;
    }
}
