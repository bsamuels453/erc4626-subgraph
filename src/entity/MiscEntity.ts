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
} from "../../generated/schema";
import { getOrCreateAccountPosition } from "./AccountEntity";
import { getERC20orFail } from "./ERC20Entity";
import { buildEventId, convertTokenToDecimal } from "../Util";

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
  depositEvent.save();
}

export function createTransferEntity(
  vault: ERC4626Vault,
  sender: Account,
  receiver: Account,
  costBasis: CostBasisLot,
  event: ethereum.Event
): void {
  let transferEvent = new TransferEvent(buildEventId(event));

  transferEvent.vault = vault.id;
  transferEvent.sender = sender.id;
  transferEvent.receiver = receiver.id;
  transferEvent.receiverLot = costBasis.id;
  transferEvent.sharesTransferred = costBasis.sharesInLot;
  transferEvent.save();
}
