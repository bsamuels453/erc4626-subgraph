import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";
import { Deposit, Transfer, Withdraw } from "../generated/ERC4626Vault/ERC4626";

export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);

export function buildEventId(event: ethereum.Event): Bytes {
  return event.transaction.hash.concatI32(event.logIndex.toI32());
}

export function exponentToBigDecimal(decimals: i32): BigDecimal {
  let decimals_BI = BigInt.fromI32(decimals);
  let bd = BigDecimal.fromString("1");
  for (let i = ZERO_BI; i.lt(decimals_BI as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export function convertTokenToDecimal(
  tokenAmount: BigInt,
  exchangeDecimals: i32
): BigDecimal {
  if (exchangeDecimals == 0) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

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
