# AuctionVickrey

**Deployed (Sepolia):** [0x6C21C4591f1EC1dd67955a02b54814aCD70800F9](https://sepolia.etherscan.io/address/0x6C21C4591f1EC1dd67955a02b54814aCD70800F9)

---

## Overview

AuctionVickrey implements a sealed-bid, second-price auction on Ethereum. Bidders submit hidden commitments during a commit phase, reveal their bids during a reveal phase, and the highest bidder wins but pays the second-highest price.

---

## Contract Structure

- **Ownership**  
  Uses an owner role for administrative actions (creation and final closing of auctions).

- **Auction Storage**  
  A mapping from `auctionId` to an Auction record, containing all per-auction state.

- **Auction Record Fields**  
  - Commit data: hidden bid hashes, deposit tracking, participation flag  
  - Reveal data: actual bid values, refund entitlements  
  - Timing: start, reveal end, auction end  
  - Outcome: current highest and second-highest bids, winning address  
  - Flags: existence and manual end indicators

---

## Auction Lifecycle & Logic

1. **Creation**  
   - Only the owner can initialize a new auction by assigning a unique ID and setting the time windows for commit and reveal phases.

2. **Commit Phase**  
   - Bidders submit a hash of their bid amount combined with a secret, along with a deposit equal to or exceeding the bid.  
   - Each address may commit only once per auction.

3. **Reveal Phase**  
   - Bidders disclose their bid amount and secret. The contract verifies the hash matches the earlier commitment.  
   - Winning logic updates the highest and second-highest bid amounts and tracks the current potential winner.

4. **Refund Phase**  
   - After the reveal window closes, participants can reclaim their deposits:  
     - Non-winning bidders receive a full refund.  
     - The winner can reclaim the difference between their deposit and the second-highest bid.

5. **Closure & Withdrawal**  
   - The owner may mark the auction as ended to prevent further interactions.  
   - Once finalized, the owner withdraws the second-highest bid amount as payment.

---

## Key Data Concepts

- **Commitment**  
  A cryptographic hash binding a bidder to a secret and bid amount without revealing it upfront.

- **Deposit Tracking**  
  Ensures bidders lock sufficient funds before committing, preventing denial-of-service with invalid reveals.

- **Winner Determination**  
  Uses revealed values to select the top bidder and calculate the price based on the runner-up bid.

- **Phase Enforcement**  
  Relies on block timestamps to strictly separate commit, reveal, and refund windows.

---

## Usage

1. Deploy the contract.  
2. Owner calls **create auction** with time windows.  
3. Bidders perform **commit** during the commit window.  
4. Bidders perform **reveal** during the reveal window.  
5. After end, participants call **refund**, and owner calls **withdraw**.

---