import {
  BigDecimal,
  Bytes,
  ethereum,
  BigInt,
  log,
} from "@graphprotocol/graph-ts";
import {
  Account,
  AccountPosition,
  CostBasisLot,
  Earnings,
  ERC4626Vault,
  LotConsumingAction,
} from "../../generated/schema";
import { buildEventId, convertTokenToDecimal } from "../Util";
import { getOrCreateAccountPosition } from "./AccountEntity";
import { getERC20orFail } from "./ERC20Entity";
import { createLotConsumingAction } from "./MiscEntity";

export function createEarningsEntity(
  vault: ERC4626Vault,
  account: Account,
  sharesRedeemed: BigInt,
  tokensWithdrawn: BigInt,
  event: ethereum.Event
): Earnings {
  // setup
  let accountPosition = getOrCreateAccountPosition(vault, account);
  let sharesRedeemedNorm = convertTokenToDecimal(
    sharesRedeemed,
    vault.decimals
  );

  let underlying = getERC20orFail(vault.underlying);
  let tokensWithdrawnNorm = convertTokenToDecimal(
    tokensWithdrawn,
    underlying.decimals
  );

  // figure out profit + tainted lots
  let changedLots = calculateLotConsumptionLIFO(
    accountPosition,
    sharesRedeemedNorm,
    event
  );

  let profit = calculateProfit(
    changedLots,
    sharesRedeemedNorm,
    tokensWithdrawnNorm
  );

  // extract lot ids
  let changedLotIds = new Array<Bytes>();
  for (let i = 0; i < changedLots.length; i++) {
    changedLotIds.push(changedLots[i].id);
  }

  // create earnings entity
  let earnings = new Earnings(buildEventId(event));
  earnings.vault = vault.id;
  earnings.account = account.id;
  earnings.block = event.block.number;
  earnings.sourceLots = changedLotIds;
  earnings.sharesRedeemed = sharesRedeemedNorm;
  earnings.assetsWithdrawn = tokensWithdrawnNorm;
  earnings.profit = profit;
  earnings.save();
  return earnings;
}

function calculateLotConsumptionLIFO(
  accountPosition: AccountPosition,
  sharesToRedeem: BigDecimal,
  event: ethereum.Event
): LotConsumingAction[] {
  let changedLots = new Array<LotConsumingAction>();
  let sharesRemaining = sharesToRedeem;

  let blockGuard = BigInt.fromI64(9_223_372_036_854_775_807);

  for (let i = accountPosition.unconsumedLots.length - 1; i >= 0; i--) {
    let lot = CostBasisLot.load(accountPosition.unconsumedLots[i])!;
    // Make sure the lot ordering has not been tampered with.
    // I was suspicious that array ordering was not preserved; this can be removed once that suspicion is cleared up.
    if (lot.block.gt(blockGuard)) {
      log.critical(
        "Error, lot {} was found to have a higher block number {} than guard {}. tx id: {}",
        [
          lot.id.toHexString(),
          lot.block.toString(),
          blockGuard.toString(),
          event.transaction.hash.toHexString(),
        ]
      );
    } else {
      blockGuard = lot.block;
    }

    let sharesToConsume: BigDecimal;

    if (sharesRemaining.lt(lot.unconsumedShares)) {
      sharesToConsume = sharesRemaining;
      sharesRemaining = BigDecimal.zero();
    } else {
      sharesToConsume = lot.unconsumedShares;
      sharesRemaining = sharesRemaining.minus(lot.unconsumedShares);
    }

    lot.unconsumedShares = lot.unconsumedShares.minus(sharesToConsume);
    lot.save();

    let consumedLot = createLotConsumingAction(sharesToConsume, lot, event);
    changedLots.push(consumedLot);

    if (sharesRemaining.equals(BigDecimal.zero())) {
      break;
    }
    if (i == 0) {
      // we've got a problem, this account has shares we don't have a cost basis for
      log.error(
        "Cannot account for the source of a user's shares during earnings calculations. \
        This often happens if the account received the shares through an airdrop or other non-4626 mechanism. \
        Account: {} Vault: {} Tx: {} Shares unaccounted for: {}",
        [
          accountPosition.account.toHexString(),
          event.address.toHexString(),
          event.transaction.hash.toHexString(),
          sharesRemaining.toString(),
        ]
      );
    }
  }
  return changedLots;
}

function calculateProfit(
  changedLots: LotConsumingAction[],
  totalSharesRedeemed: BigDecimal,
  totalTokensWithdrawn: BigDecimal
): BigDecimal {
  let costBasisAvg = BigDecimal.zero();
  for (let i = 0; i < changedLots.length; i++) {
    let lot = CostBasisLot.load(changedLots[i].lot)!;

    // weighted average
    let influenceFrac = changedLots[i].sharesConsumed.div(totalSharesRedeemed);
    let contribution = influenceFrac.times(lot.tokensInLot);
    costBasisAvg = costBasisAvg.plus(contribution);
  }

  return totalTokensWithdrawn.minus(costBasisAvg);
}
