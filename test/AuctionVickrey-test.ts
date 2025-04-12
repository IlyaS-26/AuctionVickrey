import { network, ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { keccak256, solidityPacked, parseEther, ContractTransactionResponse } from "ethers";
import "@nomicfoundation/hardhat-chai-matchers";

const INITIAL_BALANCE: bigint = parseEther("10000");

describe("Tests for Vickrey auction", function () {
    async function deploy() {
        const [deployer, user1, user2, user3, user4] = await ethers.getSigners();
        
        type UserUnderTest = {
            account: HardhatEthersSigner,
            actualBid: bigint,
            payment: bigint,
            secretPhrase: string,
            hashedBid?: string,
            balance?: bigint,
            feeCosts?: bigint
        };

        const users: UserUnderTest[] = [
            { account: user1, actualBid: parseEther("0.0012"), payment: parseEther("0.002"), secretPhrase: "Ocean"},
            { account: user2, actualBid: parseEther("1"),      payment: parseEther("6"),     secretPhrase: "Paper plane"},
            { account: user3, actualBid: parseEther("2"),      payment: parseEther("4"),     secretPhrase: "Swan"},
            { account: user4, actualBid: parseEther("0.0003"), payment: parseEther("0.004"), secretPhrase: "Cow"},
        ];

        const Factory = await ethers.getContractFactory("TestedAuctionVickrey", deployer);
        const auction = await Factory.deploy();
        await auction.waitForDeployment();

        return { deployer, users, auction };
    }

    it("Should check that auction is on reveal and then on end phases", async function () {
        const { deployer, users, auction } = await loadFixture(deploy);
        await auction.connect(deployer).createAuction(0, 20, 30);

        for (let i = 0; i < 2; i++) {
            users[i].hashedBid = keccak256(solidityPacked(["uint256", "string"], [users[i].actualBid, users[i].secretPhrase]));
        }

        await auction.connect(users[0].account).setBid(0, users[0].hashedBid!, { value: users[0].payment });

        await passTime(19);

        await expect(auction.connect(users[1].account)
            .setBid(0, users[1].hashedBid!, { value: users[1].payment }))
            .to.be.revertedWithCustomError(auction, "auctionIsOnRevealPhase");

        await passTime(9);

        await expect(auction.connect(users[1].account)
            .setBid(0, users[1].hashedBid!, { value: users[1].payment }))
            .to.be.revertedWithCustomError(auction, "auctionIsEnded");
    });

    it("Should receive some bids and reveal them", async function () {
        const { deployer, users, auction } = await loadFixture(deploy);
        await auction.connect(deployer).createAuction(0, 30, 60);

        for (const user of users) {
            user.hashedBid = keccak256(solidityPacked(["uint256", "string"], [user.actualBid, user.secretPhrase]));
            await auction.connect(user.account).setBid(0, user.hashedBid, { value: user.payment });
        }
        
        await passTime(29);

        for (const user of users) {
            await auction.connect(user.account).revealBid(0, user.actualBid, user.secretPhrase);
            expect(await auction.getBids(user.account.address, 0)).to.equal(user.actualBid);
        }
    });

    it("Should refund same funds as expected", async function () {
        const { deployer, users, auction } = await loadFixture(deploy);
        await auction.connect(deployer).createAuction(0, 90, 360);

        for (const user of users) {
            user.hashedBid = keccak256(solidityPacked(["uint256", "string"], [user.actualBid, user.secretPhrase]));
            const tx = await auction.connect(user.account).setBid(0, user.hashedBid, { value: user.payment });
            user.feeCosts = await gasCost(tx);
        }

        await passTime(89);

        for (const user of users) {
            const tx = await auction.connect(user.account).revealBid(0, user.actualBid, user.secretPhrase);
            user.feeCosts! += await gasCost(tx);
        }
        
        await passTime(269);

        for (const user of users) {
            const tx = await auction.connect(user.account).refundBid(0);
            user.feeCosts! += await gasCost(tx);
        }
        
        for (const user of users) {
            user.balance = await ethers.provider.getBalance(user.account.address);
            const winnerAddress = await auction.getWinner(0);
            const auctionInfo = await auction.getAuctionInfoById(0);
            if (user.account.address == winnerAddress) {
                expect(user.balance).to.equal(INITIAL_BALANCE - auctionInfo.preMaxBid - user.feeCosts!)
            } else {
                expect(user.balance).to.equal(INITIAL_BALANCE - user.feeCosts!)
            }
        }
    })

    async function gasCost(tx: ContractTransactionResponse) {
        const receipt = await tx.wait();
        const gasUsed = receipt?.gasUsed;
        const gasPrice = receipt?.gasPrice;
        return gasUsed! * gasPrice!;
    }

    async function passTime(time: number) {
        await network.provider.send("evm_increaseTime", [time]);
        await network.provider.send("evm_mine");
    }
});