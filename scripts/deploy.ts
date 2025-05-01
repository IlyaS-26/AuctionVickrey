import { ethers } from "hardhat";

async function main() {

    const auction = await ethers.deployContract("AuctionVickrey");

    await auction.waitForDeployment();

    console.log(`Auction deployed to ${auction.target}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});