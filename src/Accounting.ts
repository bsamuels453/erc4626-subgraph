import {
  Address,
  BigDecimal,
  ethereum,
  log,
  BigInt,
} from "@graphprotocol/graph-ts";
import {
  Account,
  CostBasisLot,
  ERC4626Vault,
  ERC20Token as ERC20Entity,
  ERC4626Vault as ERC4626Entity,
  DepositEvent,
  TransferEvent,
  Earnings,
} from "../generated/schema";
import { getOrCreateAccountPosition } from "./entity/AccountEntity";
import { getERC20orFail } from "./entity/ERC20Entity";
import { buildEventId, convertTokenToDecimal } from "./Util";

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
  earnings: Earnings
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

  accountPosition.earnings = historicalEarnings;
  accountPosition.unconsumedLots = unconsumedLots;
  accountPosition.save();
}
