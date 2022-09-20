import { Address, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import {
  Account,
  CostBasisLot,
  ERC4626Vault,
  DepositEvent,
  TransferEvent,
  Earnings,
  WithdrawEvent,
  LotConsumingAction,
} from "../../generated/schema";
import { buildEventId } from "../Util";

export function createDepositEntity(
  vault: ERC4626Vault,
  account: Account,
  sender: Address,
  costBasis: CostBasisLot,
  event: ethereum.Event
): void {
  let depositEvent = new DepositEvent(buildEventId(event));
  depositEvent.vault = vault.id;
  depositEvent.account = account.id;
  depositEvent.sender = sender;
  depositEvent.assetsDeposited = costBasis.tokensInLot;
  depositEvent.sharesMinted = costBasis.sharesInLot;
  depositEvent.lot = costBasis.id;
  depositEvent.block = event.block.number;
  depositEvent.save();
}

export function createWithdrawEntity(
  vault: ERC4626Vault,
  account: Account,
  sender: Address,
  earnings: Earnings,
  event: ethereum.Event
): void {
  let withdrawEvent = new WithdrawEvent(buildEventId(event));

  withdrawEvent.vault = vault.id;
  withdrawEvent.account = account.id;
  withdrawEvent.sender = sender;
  withdrawEvent.assetsWithdrawn = earnings.assetsWithdrawn;
  withdrawEvent.sharesRedeemed = earnings.sharesRedeemed;
  withdrawEvent.block = event.block.number;
}

export function createTransferEntity(
  vault: ERC4626Vault,
  sender: Account,
  receiver: Account,
  costBasis: CostBasisLot,
  earnings: Earnings,
  event: ethereum.Event
): void {
  let transferEvent = new TransferEvent(buildEventId(event));

  transferEvent.vault = vault.id;
  transferEvent.sender = sender.id;
  transferEvent.senderEarnings = earnings.id;
  transferEvent.receiver = receiver.id;
  transferEvent.receiverLot = costBasis.id;
  transferEvent.sharesTransferred = costBasis.sharesInLot;
  transferEvent.block = event.block.number;
  transferEvent.save();
}

export function createLotConsumingAction(
  sharesConsumed: BigDecimal,
  lot: CostBasisLot,
  event: ethereum.Event
): LotConsumingAction {
  let eventId = buildEventId(event);
  let id = eventId.concat(lot.id);

  let lotConsumed = new LotConsumingAction(id);
  lotConsumed.sharesConsumed = sharesConsumed;
  lotConsumed.lot = lot.id;
  lotConsumed.save();
  return lotConsumed;
}
