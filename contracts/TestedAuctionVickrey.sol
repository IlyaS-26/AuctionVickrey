// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./AuctionVickrey.sol";

contract TestedAuctionVickrey is AuctionVickrey {
    function getAuctionInfoById(
        uint256 _auctionId
    )
        external
        view
        returns (
            address currentWinner,
            uint256 startTime,
            uint256 revealTime,
            uint256 endTime,
            uint256 maxBid,
            uint256 preMaxBid,
            bool isExist
        )
    {
        Auction storage auctionInstance = auctions[_auctionId];
        require(auctionInstance.isExist == true, auctionIsNotExist());
        return (
            auctionInstance.currentWinner,
            auctionInstance.startTime,
            auctionInstance.revealTime,
            auctionInstance.endTime,
            auctionInstance.maxBid,
            auctionInstance.preMaxBid,
            auctionInstance.isExist
        );
    }

    function getHashedBids(
        address userAddress,
        uint256 _auctionId
    ) external view returns (bytes32) {
        Auction storage auctionInstance = auctions[_auctionId];
        return auctionInstance.hashedBids[userAddress];
    }

    function getBids(
        address userAddress,
        uint256 _auctionId
    ) external view returns (uint256) {
        Auction storage auctionInstance = auctions[_auctionId];
        return auctionInstance.bids[userAddress];
    }

    function getUserFunds(
        address userAddress,
        uint256 _auctionId
    ) external view returns (uint256) {
        Auction storage auctionInstance = auctions[_auctionId];
        return auctionInstance.userFunds[userAddress];
    }
}
