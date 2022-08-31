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
} from "../../generated/schema";
import { buildEventId, convertTokenToDecimal } from "../Util";
import { getOrCreateAccountPosition } from "./AccountEntity";
import { getERC20orFail } from "./ERC20Entity";

class ChangedLots {
  lots = new Array<Bytes>();
  sharesConsumed = new Array<BigDecimal>();
}

function calculateLotConsumptionLIFO(
  accountPosition: AccountPosition,
  sharesToRedeem: BigDecimal,
  event: ethereum.Event
): ChangedLots {
  let changedLots = new ChangedLots();
  let sharesRemaining = sharesToRedeem;

  for (let i = accountPosition.unconsumedLots.length - 1; i >= 0; i--) {
    let lot = CostBasisLot.load(accountPosition.unconsumedLots[i])!;
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
    changedLots.lots.push(lot.id);
    changedLots.sharesConsumed.push(sharesToConsume);

    if (sharesRemaining.equals(BigDecimal.zero())) {
      break;
    }
    if (i == 0) {
      // we've got a problem, this account has shares we don't have a cost basis for
      log.critical(
        "Cannot account for the source of a user's shares during earnings calculations. Account: {} Vault: {} Tx: {}",
        [
          accountPosition.account.toHexString(),
          event.address.toHexString(),
          event.transaction.hash.toHexString(),
        ]
      );
    }
  }
  return changedLots;
}

function calculateProfit(
  changedLots: ChangedLots,
  totalSharesRedeemed: BigDecimal,
  totalTokensWithdrawn: BigDecimal
): BigDecimal {
  let costBasisAvg = BigDecimal.zero();
  for (let i = 0; i < changedLots.lots.length; i++) {
    let lot = CostBasisLot.load(changedLots.lots[i])!;

    // weighted average
    let influenceFrac = changedLots.sharesConsumed[i].div(totalSharesRedeemed);
    let contribution = influenceFrac.times(lot.tokensInLot);
    costBasisAvg = costBasisAvg.plus(contribution);
  }

  return totalTokensWithdrawn.minus(costBasisAvg);
}

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

  // create earnings entity
  let earnings = new Earnings(buildEventId(event));
  earnings.vault = vault.id;
  earnings.account = account.id;
  earnings.sourceLots = changedLots.lots;
  earnings.sourcedQuantities = changedLots.sharesConsumed;

  earnings.sharesRedeemed = sharesRedeemedNorm;
  earnings.tokensReceived = tokensWithdrawnNorm;
  earnings.profit = profit;
  earnings.save();
  return earnings;
}
