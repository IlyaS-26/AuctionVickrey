import { network } from "hardhat";
import { loadFixture, ethers, expect } from "./setup";
import { keccak256, solidityPacked, parseEther, ContractTransactionResponse } from "ethers";

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

    it("Should refund same funds as expected", async function () {
        const { deployer, user1, user2, user3, user4, auction } = await loadFixture(deploy);
        await auction.connect(deployer).createAuction(0, 90, 360);

        const user1InitialBalance = await ethers.provider.getBalance(user1.address);
        const user2InitialBalance = await ethers.provider.getBalance(user2.address);
        const user3InitialBalance = await ethers.provider.getBalance(user3.address);
        const user4InitialBalance = await ethers.provider.getBalance(user4.address);

        const bidByUser1 = keccak256(solidityPacked(["uint256", "string"], [parseEther("0.00076"), "Wind"]));
        const bidByUser2 = keccak256(solidityPacked(["uint256", "string"], [parseEther("6"), "Leaf"]));
        const bidByUser3 = keccak256(solidityPacked(["uint256", "string"], [parseEther("0.015"), "Tree"]));
        const bidByUser4 = keccak256(solidityPacked(["uint256", "string"], [parseEther("1.54"), "Moss"]));

        const tx_user1_setBid = await auction.connect(user1).setBid(0, bidByUser1, { value: parseEther("1") });
        const tx_user2_setBid = await auction.connect(user2).setBid(0, bidByUser2, { value: parseEther("10") });
        const tx_user3_setBid = await auction.connect(user3).setBid(0, bidByUser3, { value: parseEther("0.1") });
        const tx_user4_setBid = await auction.connect(user4).setBid(0, bidByUser4, { value: parseEther("3") });

        let user1_gasCost = await gasCost(tx_user1_setBid);
        let user2_gasCost = await gasCost(tx_user2_setBid);
        let user3_gasCost = await gasCost(tx_user3_setBid);
        let user4_gasCost = await gasCost(tx_user4_setBid);

        await passTime(89);

        const tx_user1_revealBid = await auction.connect(user1).revealBid(0, parseEther("0.00076"), "Wind");
        const tx_user2_revealBid = await auction.connect(user2).revealBid(0, parseEther("6"), "Leaf");
        const tx_user3_revealBid = await auction.connect(user3).revealBid(0, parseEther("0.015"), "Tree");
        const tx_user4_revealBid = await auction.connect(user4).revealBid(0, parseEther("1.54"), "Moss");

        user1_gasCost += await gasCost(tx_user1_revealBid);
        user2_gasCost += await gasCost(tx_user2_revealBid);
        user3_gasCost += await gasCost(tx_user3_revealBid);
        user4_gasCost += await gasCost(tx_user4_revealBid);

        await passTime(269);

        const tx_user1_refundBid = await auction.connect(user1).refundBid(0);
        const tx_user2_refundBid = await auction.connect(user2).refundBid(0);
        const tx_user3_refundBid = await auction.connect(user3).refundBid(0);
        const tx_user4_refundbid = await auction.connect(user4).refundBid(0);

        user1_gasCost += await gasCost(tx_user1_refundBid);
        user2_gasCost += await gasCost(tx_user2_refundBid);
        user3_gasCost += await gasCost(tx_user3_refundBid);
        user4_gasCost += await gasCost(tx_user4_refundbid);

        const user1FinalBalance = await ethers.provider.getBalance(user1.address);
        const user2FinalBalance = await ethers.provider.getBalance(user2.address);
        const user3FinalBalance = await ethers.provider.getBalance(user3.address);
        const user4FinalBalance = await ethers.provider.getBalance(user4.address);

        expect(user1FinalBalance).to.equal(user1InitialBalance - user1_gasCost);
        expect(user2FinalBalance).to.equal(user2InitialBalance - parseEther("1.54") - user2_gasCost);
        expect(user3FinalBalance).to.equal(user3InitialBalance - user3_gasCost);
        expect(user4FinalBalance).to.equal(user4InitialBalance - user4_gasCost);
    })

    async function gasCost(tx: ContractTransactionResponse) {
        const receipt = await tx.wait();
        const gasUsed = receipt?.gasUsed;
        const gasPrice = tx.gasPrice;
        return gasUsed! * gasPrice;
    }

    async function passTime(time: number) {
        await network.provider.send("evm_increaseTime", [time]);
        await network.provider.send("evm_mine");
    }
});