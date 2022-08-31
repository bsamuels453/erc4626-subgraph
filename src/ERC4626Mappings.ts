import {
  Bytes,
  log,
  ethereum,
  BigDecimal,
  BigInt,
} from "@graphprotocol/graph-ts";
import { Deposit, Withdraw, Transfer } from "../generated/ERC4626Vault/ERC4626";
import {
  CostBasisLot,
  DepositEvent,
  ERC20Token as ERC20Entity,
  ERC4626Vault as ERC4626Entity,
  ERC4626Vault,
  NonERC4626Contract as NonERC4626Entity,
  WithdrawEvent,
} from "../generated/schema";
import {
  getOrCreateAccount,
  getOrCreateAccountPosition,
} from "./entity/AccountEntity";
import { getERC4626orFail, isContractERC4626 } from "./entity/ERC4626Entity";
import { updateAccountForDeposit } from "./Accounting";
import {
  buildEventId,
  convertTokenToDecimal,
  isDepositEventAnomalous,
  isTransferEventAnomalous,
} from "./Util";
import { ERC4626 as ERC4626RPC } from "../generated/ERC4626Vault/ERC4626";
import { createCostBasisEntity } from "./entity/CostBasisEntity";
import { createDepositEntity, createTransferEntity } from "./entity/MiscEntity";

export function handleDepositEvent(event: Deposit): void {
  if (!isContractERC4626(event.address)) {
    return;
  }

  if (isDepositEventAnomalous(event)) {
    return;
  }

  let vault = getERC4626orFail(event.address);

  let costBasis = createCostBasisEntity(
    vault,
    event.params.assets,
    event.params.shares,
    event
  );

  let account = getOrCreateAccount(event.params.owner);
  updateAccountForDeposit(vault, account, costBasis);
  createDepositEntity(vault, account, event.params.sender, costBasis, event);

  // updateVaultMetrics(...)
}

export function handleWithdrawEvent(event: Withdraw): void {
  // datasource is garaunteed to be a valid vault, don't bother checking
}

export function handleTransferEvent(event: Transfer): void {
  // datasource is garaunteed to be a valid vault, don't bother checking
  if (isTransferEventAnomalous(event)) {
    return;
  }

  let vaultRPC = ERC4626RPC.bind(event.address);
  let tokensEquivalent = vaultRPC.convertToAssets(event.params.value);

  let vault = getERC4626orFail(event.address);

  //todo: handle withdraw logic

  let costBasis = createCostBasisEntity(
    vault,
    tokensEquivalent,
    event.params.value,
    event
  );

  let sender = getOrCreateAccount(event.params.from);
  let receiver = getOrCreateAccount(event.params.to);
  updateAccountForDeposit(vault, receiver, costBasis);
  createTransferEntity(vault, sender, receiver, costBasis, event);
}
