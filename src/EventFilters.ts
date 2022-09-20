import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { Deposit, Transfer, Withdraw } from "../generated/ERC4626Vault/ERC4626";

export function isDepositEventAnomalous(event: Deposit): boolean {
  if (event.params.assets == BigInt.zero()) {
    log.info("Deposit of 0 assets, skipping tx: {}", [
      event.transaction.hash.toHexString(),
    ]);
    return true;
  }
  if (event.params.shares == BigInt.zero()) {
    log.info("Deposit of 0 shares, skipping tx: {}", [
      event.transaction.hash.toHexString(),
    ]);
    return true;
  }
  return false;
}

export function isWithdrawEventAnomalous(event: Withdraw): boolean {
  if (event.params.assets == BigInt.zero()) {
    log.info("Withdraw of 0 assets, skipping tx: {}", [
      event.transaction.hash.toHexString(),
    ]);
    return true;
  }
  if (event.params.shares == BigInt.zero()) {
    log.info("Withdraw of 0 shares, skipping tx: {}", [
      event.transaction.hash.toHexString(),
    ]);
    return true;
  }
  return false;
}

export function isTransferEventAnomalous(event: Transfer): boolean {
  if (event.params.value == BigInt.zero()) {
    log.info("Transfer of 0 shares, skipping tx: {}", [
      event.transaction.hash.toHexString(),
    ]);
    return true;
  }
  // do not treat mint/burn transfers as earnings events
  if (event.params.from == Address.zero()) {
    return true;
  }
  if (event.params.to == Address.zero()) {
    return true;
  }

  return false;
}
