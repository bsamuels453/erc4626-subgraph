import { BigDecimal, ethereum, log } from "@graphprotocol/graph-ts";
import {
  Account,
  CostBasisLot,
  ERC4626Vault,
  Earnings,
} from "../generated/schema";
import { getOrCreateAccountPosition } from "./entity/AccountEntity";

export function updateAccountForDeposit(
  vault: ERC4626Vault,
  owner: Account,
  costBasis: CostBasisLot
): void {
  let accountPosition = getOrCreateAccountPosition(vault, owner);

  accountPosition.shares = accountPosition.shares.plus(costBasis.sharesInLot);

  let unconsumedLots = accountPosition.unconsumedLots;
  unconsumedLots.push(costBasis.id);
  accountPosition.unconsumedLots = unconsumedLots;

  accountPosition.save();
}

export function updateAccountForWithdraw(
  vault: ERC4626Vault,
  owner: Account,
  earnings: Earnings,
  event: ethereum.Event
): void {
  let accountPosition = getOrCreateAccountPosition(vault, owner);

  // Check each lot to see if it's been consumed. This code only works with LIFO.
  let unconsumedLots = accountPosition.unconsumedLots;
  for (let i = accountPosition.unconsumedLots.length - 1; i >= 0; i--) {
    let lot = CostBasisLot.load(accountPosition.unconsumedLots[i])!;
    if (lot.unconsumedShares.equals(BigDecimal.zero())) {
      unconsumedLots.pop();
    } else {
      break;
    }
  }

  // Update earnings
  let historicalEarnings = accountPosition.earnings;
  historicalEarnings.push(earnings.id);

  if (
    accountPosition.shares.minus(earnings.sharesRedeemed).lt(BigDecimal.zero())
  ) {
    log.info(
      "Transaction would send user's shares below zero; TX: {}  Previous account position: {}  Amount of shares redeemed: {} Owner: {} ",
      [
        event.transaction.hash.toHexString(),
        accountPosition.shares.toString(),
        earnings.sharesRedeemed.toString(),
        owner.id.toHexString(),
      ]
    );
  }

  accountPosition.shares = accountPosition.shares.minus(
    earnings.sharesRedeemed
  );
  accountPosition.earnings = historicalEarnings;
  accountPosition.unconsumedLots = unconsumedLots;
  accountPosition.save();
}
