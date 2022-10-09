import { Deposit, Withdraw, Transfer } from "../generated/ERC4626Vault/ERC4626";
import { getOrCreateAccount } from "./entity/AccountEntity";
import { getERC4626orFail, isContractERC4626 } from "./entity/ERC4626Entity";
import {
  updateAccountForDeposit,
  updateAccountForWithdraw,
} from "./Accounting";
import { ERC4626 as ERC4626RPC } from "../generated/ERC4626Vault/ERC4626";
import { createCostBasisEntity } from "./entity/CostBasisEntity";
import {
  createDepositEntity,
  createTransferEntity,
  createWithdrawEntity,
} from "./entity/MiscEntity";
import { createEarningsEntity } from "./entity/EarningsEntity";
import {
  isDepositEventAnomalous,
  isTransferEventAnomalous,
  isWithdrawEventAnomalous,
} from "./EventFilters";

export function handleDepositEvent(event: Deposit): void {
  if (
    !isContractERC4626(event.address, event) ||
    isDepositEventAnomalous(event)
  ) {
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
  updateAccountForDeposit(vault, account, costBasis, event);
  createDepositEntity(vault, account, event.params.sender, costBasis, event);

  // updateVaultMetrics(...)
}

export function handleWithdrawEvent(event: Withdraw): void {
  // datasource is guaranteed to be a valid vault, don't bother checking
  if (isWithdrawEventAnomalous(event)) {
    return;
  }

  let vault = getERC4626orFail(event.address);
  let owner = getOrCreateAccount(event.params.owner);

  let earnings = createEarningsEntity(
    vault,
    owner,
    event.params.shares,
    event.params.assets,
    event
  );

  updateAccountForWithdraw(vault, owner, earnings, event);
  createWithdrawEntity(vault, owner, event.params.sender, earnings, event);

  // updateVaultMetrics(...)
}

export function handleTransferEvent(event: Transfer): void {
  // datasource is guaranteed to be a valid vault, don't bother checking
  if (isTransferEventAnomalous(event)) {
    return;
  }

  let vaultRPC = ERC4626RPC.bind(event.address);
  let tokensEquivalent = vaultRPC.convertToAssets(event.params.value);

  let vault = getERC4626orFail(event.address);
  let sender = getOrCreateAccount(event.params.from);

  // process the sent amount as a withdrawal
  let earnings = createEarningsEntity(
    vault,
    sender,
    event.params.value,
    tokensEquivalent,
    event
  );

  updateAccountForWithdraw(vault, sender, earnings, event);

  // process the received amount as a deposit
  let costBasis = createCostBasisEntity(
    vault,
    tokensEquivalent,
    event.params.value,
    event
  );

  let receiver = getOrCreateAccount(event.params.to);
  updateAccountForDeposit(vault, receiver, costBasis, event);
  createTransferEntity(vault, sender, receiver, costBasis, earnings, event);

  // updateVaultMetrics(...)
}
