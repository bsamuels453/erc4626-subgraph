import { BigDecimal, ethereum, log } from "@graphprotocol/graph-ts";
import {
  Account,
  CostBasisLot,
  ERC4626Vault,
  Earnings,
} from "../generated/schema";
import {
  getAccountPositionOrFail,
  getOrCreateAccountPosition,
} from "./entity/AccountEntity";
import { rpcGetERC4626AccountBalance } from "./Util";

export function updateAccountForDeposit(
  vault: ERC4626Vault,
  owner: Account,
  costBasis: CostBasisLot,
  event: ethereum.Event
): void {
  let accountPosition = getOrCreateAccountPosition(vault, owner);

  accountPosition.accountableShares = accountPosition.accountableShares.plus(
    costBasis.sharesInLot
  );
  accountPosition.shares = rpcGetERC4626AccountBalance(vault, owner.id);

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
  let accountPosition = getAccountPositionOrFail(vault, owner);

  // Check each accountPosition cost basis lot & remove ones that were consumed when earnings were calculated. This code only works with LIFO.
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
    accountPosition.accountableShares
      .minus(earnings.sharesRedeemed)
      .lt(BigDecimal.zero())
  ) {
    vault.accountingErrata = true;
    vault.save();
    log.critical(
      "Transaction would send user's shares below zero; TX: {}  Previous account position: {}  Amount of shares redeemed: {} Owner: {} ",
      [
        event.transaction.hash.toHexString(),
        accountPosition.accountableShares.toString(),
        earnings.sharesRedeemed.toString(),
        owner.id.toHexString(),
      ]
    );
  }

  accountPosition.accountableShares = accountPosition.accountableShares.minus(
    earnings.sharesRedeemed
  );
  accountPosition.shares = rpcGetERC4626AccountBalance(vault, owner.id);

  accountPosition.earnings = historicalEarnings;
  accountPosition.unconsumedLots = unconsumedLots;
  accountPosition.save();
}
