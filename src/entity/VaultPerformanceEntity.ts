import {
  Deposit,
  Withdraw,
  Transfer,
} from "../../generated/ERC4626Vault/ERC4626";
import { getOrCreateAccount } from "../entity/AccountEntity";
import { getERC4626orFail, isContractERC4626 } from "../entity/ERC4626Entity";
import {
  updateAccountForDeposit,
  updateAccountForWithdraw,
} from "../Accounting";
import { ERC4626 as ERC4626RPC } from "../../generated/ERC4626Vault/ERC4626";
import { createCostBasisEntity } from "../entity/CostBasisEntity";
import {
  createDepositEntity,
  createTransferEntity,
  createWithdrawEntity,
} from "../entity/MiscEntity";
import { createEarningsEntity } from "../entity/EarningsEntity";
import {
  isDepositEventAnomalous,
  isTransferEventAnomalous,
  isWithdrawEventAnomalous,
} from "../EventFilters";
import { ERC4626Vault } from "../../generated/schema";
import { bigDecimal, BigDecimal } from "@graphprotocol/graph-ts";

export function updateVaultAPYMetrics(
  vault: ERC4626Vault,
  event: Withdraw
): void {
  let d: BigDecimal;
  d.exp();
}
