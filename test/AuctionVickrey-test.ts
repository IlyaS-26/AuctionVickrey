import { network } from "hardhat";
import { loadFixture, ethers, expect } from "./setup";

describe("Tests for Vickrey auction", function() {
    async function deploy() {
        const [deployer, user1, user2] = await ethers.getSigners();

        const Factory = await ethers.getContractFactory("TestedAuctionVickrey", deployer);
        const auction = await Factory.deploy();
        await auction.waitForDeployment();

        return { deployer, user1, user2, auction };
    }

    it("Should check that auction is over", async function () {
        const { deployer, user1, user2, auction } = await loadFixture(deploy);
        await auction.connect(deployer).createAuction(0, 5, 6);

        const bidByUser1 = ethers.keccak256(ethers.toUtf8Bytes("10, cat"));
        const bidByUser2 = ethers.keccak256(ethers.toUtf8Bytes("15, dog"));

        await auction.connect(user1).setBid(0, bidByUser1, {value: ethers.parseEther("10")});
    
       //const delay = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));
       //await delay(6);
       await network.provider.send("evm_increaseTime",[6]);
       await network.provider.send("evm_mine");

        await expect(auction.connect(user2)
        .setBid(0, bidByUser2, {value: ethers.parseEther("10")}))
        .to.be.revertedWithCustomError(auction, "auctionIsEnded()");
    });
    
});