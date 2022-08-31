import { Address, log } from "@graphprotocol/graph-ts";
import { 
  ERC20Token as ERC20Entity
} from '../../generated/schema';
import { ERC20 as ERC20RPC } from '../../generated/ERC4626Vault/ERC20'
import { DSToken as DsTokenRPC } from '../../generated/ERC4626Vault/DSToken'


export function getOrImportERC20(address: Address): ERC20Entity | null {
  // check if we've seen this contract before
  let entity = ERC20Entity.load(address);
  if(entity != null){
    return entity;
  }

  // test rpc methods
  let contract = ERC20RPC.bind(address);

  let name: string;
  let nameRes = contract.try_name();
  if(nameRes.reverted){
    // thanks maker
    let dsTokenContract = DsTokenRPC.bind(address);
    let dsNameRes = dsTokenContract.try_name();
    if(dsNameRes.reverted){
      log.warning("Contract is not ERC20 compliant, name() reverted: {}", [address.toHexString()]);
      return null;
    } else {
      name = dsNameRes.value.toString();
    }
  } else {
    name = nameRes.value;
  }

  let symbol: string;
  let symbolRes = contract.try_symbol();
  if(symbolRes.reverted){
    let dsTokenContract = DsTokenRPC.bind(address);
    let dsSymbolRes = dsTokenContract.try_symbol();
    if(dsSymbolRes.reverted){
      log.warning("Contract is not ERC20 compliant, symbol() reverted: {}", [address.toHexString()]);
      return null;
    } else {
      symbol = dsSymbolRes.value.toString();
    }
  } else {
    symbol = symbolRes.value;
  }

  let decimals = contract.try_decimals();
  if(decimals.reverted){
    log.warning("Contract is not ERC20 compliant, decimals() reverted: {}", [address.toHexString()]);
    return null;
  }

  let totalSupply = contract.try_totalSupply();
  if(totalSupply.reverted) {
    log.info("Contract is not ERC20 compliant, totalSupply() reverted: {}", [address.toHexString()]);
    return null;
  }

  // that's enough validation, create the entity.
  entity = new ERC20Entity(address);
  entity.decimals = decimals.value;
  entity.symbol = symbol;
  entity.name = name;
  entity.save();
  return entity;
}