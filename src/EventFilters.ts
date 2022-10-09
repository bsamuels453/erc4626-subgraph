import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { Deposit, Transfer, Withdraw } from "../generated/ERC4626Vault/ERC4626";
import { DebugMintEvent } from "../generated/schema";
import { buildEventId, convertTokenToDecimal } from "./Util";
import { ERC4626 as ERC4626RPC } from "../generated/ERC4626Vault/ERC4626";

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
  // do not treat mint transfers as a deposit event
  if (event.params.from == Address.zero()) {
    createMintEvent(event);
    return true;
  }
  // do not treat burn transfers as an earnings event
  if (event.params.to == Address.zero()) {
    return true;
  }

  return false;
}

function createMintEvent(event: Transfer): void {
  let id = buildEventId(event);
  let mintEvent = new DebugMintEvent(id);
  let rpc = ERC4626RPC.bind(event.address);
  mintEvent.vault = event.address;
  mintEvent.receiver = event.params.to;
  mintEvent.amount = convertTokenToDecimal(event.params.value, rpc.decimals());
  mintEvent.txHash = event.transaction.hash;
  mintEvent.blockNum = event.block.number;
  mintEvent.save();
}
