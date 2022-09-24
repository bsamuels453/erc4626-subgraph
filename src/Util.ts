import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";
import { ERC4626 as ERC4626RPC } from "../generated/ERC4626Vault/ERC4626";
import { ERC4626Vault } from "../generated/schema";

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

export function rpcGetERC4626AccountBalance(
  vault: ERC4626Vault,
  address: Bytes
): BigDecimal {
  let vaultContract = ERC4626RPC.bind(Address.fromBytes(vault.id));
  let res = vaultContract.try_balanceOf(Address.fromBytes(address));
  if (res.reverted) {
    log.critical(
      "call to vault.balanceOf(address) reverted; Vault addr: {} Account addr: {}",
      [vault.id.toHexString(), address.toHexString()]
    );
  }

  return convertTokenToDecimal(res.value, vault.decimals);
}
