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
  Transaction,
} from "../../generated/schema";
import { buildEventId } from "../Util";

export function getOrCreateTransactionEntity(
  event: ethereum.Event
): Transaction {
  let transactionId = event.transaction.hash;
  let txEntity = Transaction.load(transactionId);
  if (txEntity != null) {
    return txEntity;
  } else {
    let newTxEntity = new Transaction(transactionId);
    newTxEntity.block = event.block.number;
    newTxEntity.timestamp = event.block.timestamp;
    newTxEntity.index = event.transaction.index;
    newTxEntity.save();
    return newTxEntity;
  }
}

export function createDepositEntity(
  vault: ERC4626Vault,
  account: Account,
  sender: Address,
  costBasis: CostBasisLot,
  event: ethereum.Event
): void {
  let depositEvent = new DepositEvent(buildEventId(event));
  let transaction = getOrCreateTransactionEntity(event);

  depositEvent.block = event.block.number;
  depositEvent.logIndex = event.logIndex;
  depositEvent.transaction = transaction.id;
  depositEvent.vault = vault.id;
  depositEvent.account = account.id;
  depositEvent.sender = sender;
  depositEvent.assetsDeposited = costBasis.tokensInLot;
  depositEvent.sharesMinted = costBasis.sharesInLot;
  depositEvent.lot = costBasis.id;
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
  let transaction = getOrCreateTransactionEntity(event);

  withdrawEvent.block = event.block.number;
  withdrawEvent.logIndex = event.logIndex;
  withdrawEvent.transaction = transaction.id;
  withdrawEvent.vault = vault.id;
  withdrawEvent.account = account.id;
  withdrawEvent.sender = sender;
  withdrawEvent.assetsWithdrawn = earnings.assetsWithdrawn;
  withdrawEvent.sharesRedeemed = earnings.sharesRedeemed;
  withdrawEvent.earnings = earnings.id;
  withdrawEvent.save();
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
  let transaction = getOrCreateTransactionEntity(event);

  transferEvent.block = event.block.number;
  transferEvent.logIndex = event.logIndex;
  transferEvent.transaction = transaction.id;
  transferEvent.vault = vault.id;
  transferEvent.sender = sender.id;
  transferEvent.senderEarnings = earnings.id;
  transferEvent.receiver = receiver.id;
  transferEvent.receiverLot = costBasis.id;
  transferEvent.sharesTransferred = costBasis.sharesInLot;
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
