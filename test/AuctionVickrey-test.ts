import { network } from "hardhat";
import { loadFixture, ethers, expect } from "./setup";
import { keccak256, solidityPacked, parseEther } from "ethers";

describe("Tests for Vickrey auction", function () {
    async function deploy() {
        const [deployer, user1, user2, user3, user4] = await ethers.getSigners();

        const Factory = await ethers.getContractFactory("TestedAuctionVickrey", deployer);
        const auction = await Factory.deploy();
        await auction.waitForDeployment();

        return { deployer, user1, user2, user3, user4, auction };
    }

    it("Should check that auction is on reveal and then on end phases", async function () {
        const { deployer, user1, user2, auction } = await loadFixture(deploy);
        await auction.connect(deployer).createAuction(0, 20, 30);

        const bidByUser1 = keccak256(solidityPacked(["uint256", "string"], [parseEther("10"), "Cat"]));
        const bidByUser2 = keccak256(solidityPacked(["uint256", "string"], [parseEther("15"), "Dog"]));

        await auction.connect(user1).setBid(0, bidByUser1, { value: parseEther("10") });

        //might be +1 sec
        await passTime(19);

        await expect(auction.connect(user2)
            .setBid(0, bidByUser2, { value: parseEther("15") }))
            .to.be.revertedWithCustomError(auction, "auctionIsOnRevealPhase");

        await passTime(9);

        await expect(auction.connect(user2)
            .setBid(0, bidByUser2, { value: parseEther("15") }))
            .to.be.revertedWithCustomError(auction, "auctionIsEnded");
    });

    it("Should receive some bids and reveal them", async function () {
        const { deployer, user1, user2, user3, user4, auction } = await loadFixture(deploy);
        await auction.connect(deployer).createAuction(0, 30, 60);

        const bidByUser1 = keccak256(solidityPacked(["uint256", "string"], [parseEther("0.0012"), "Ocean"]));
        const bidByUser2 = keccak256(solidityPacked(["uint256", "string"], [parseEther("1"), "Paper plane"]));
        const bidByUser3 = keccak256(solidityPacked(["uint256", "string"], [parseEther("2"), "Swan"]));
        const bidByUser4 = keccak256(solidityPacked(["uint256", "string"], [parseEther("0.0003"), "Cow"]));

        await auction.connect(user1).setBid(0, bidByUser1, { value: parseEther("0.002") });
        await auction.connect(user2).setBid(0, bidByUser2, { value: parseEther("6") });
        await auction.connect(user3).setBid(0, bidByUser3, { value: parseEther("4") });
        await auction.connect(user4).setBid(0, bidByUser4, { value: parseEther("0.004") });

        await passTime(29);

        await auction.connect(user1).revealBid(0, parseEther("0.0012"), "Ocean");
        await auction.connect(user2).revealBid(0, parseEther("1"), "Paper plane");
        await auction.connect(user3).revealBid(0, parseEther("2"), "Swan");
        await auction.connect(user4).revealBid(0, parseEther("0.0003"), "Cow");

        expect(await auction.getBids(user1.address, 0)).to.equal(parseEther("0.0012"));
        expect(await auction.getBids(user2.address, 0)).to.equal(parseEther("1"));
        expect(await auction.getBids(user3.address, 0)).to.equal(parseEther("2"));
        expect(await auction.getBids(user4.address, 0)).to.equal(parseEther("0.0003"));

    });

    async function passTime(time: number) {
        await network.provider.send("evm_increaseTime", [time]);
        await network.provider.send("evm_mine");
    }

});