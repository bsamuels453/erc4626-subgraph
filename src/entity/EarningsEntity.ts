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
  let unaccountableShares: BigDecimal | null = null;

  let underlying = getERC20orFail(vault.underlying);
  let tokensWithdrawnNorm = convertTokenToDecimal(
    tokensWithdrawn,
    underlying.decimals
  );

  // Check to see if there's  been any account errors introduced by non-erc4626 transfers.
  // In the future, we should consider treating these unaccountable shares as acquired at price=0.
  if (sharesRedeemedNorm.gt(accountPosition.accountableShares)) {
    if (
      !accountPosition.account
        .toHexString()
        .includes("0xda1fd36cfc50ed03ca4dd388858a78c904379fb3")
    ) {
      log.warning(
        "An earnings event is trying to redeem more shares than we can account for. Account: {} Shares redeemed: {} Shares we can account for: {} Vault: {} TxHash: {} Real share balance from AccountPosition: {}",
        [
          accountPosition.account.toHexString(),
          sharesRedeemedNorm.toString(),
          accountPosition.accountableShares.toString(),
          vault.id.toHexString(),
          event.transaction.hash.toHexString(),
          accountPosition.shares.toString(),
        ]
      );
    }
    unaccountableShares = sharesRedeemedNorm.minus(
      accountPosition.accountableShares
    );
    sharesRedeemedNorm = accountPosition.accountableShares;
  }

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
  earnings.unaccountableShares = unaccountableShares;
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

    let consumedLot = createLotConsumingAction(sharesToConsume, lot, event);
    changedLots.push(consumedLot);

    if (sharesRemaining.equals(BigDecimal.zero())) {
      break;
    }
    if (i == 0) {
      // we've got a problem, this account has shares we don't have a cost basis for
      log.critical(
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
