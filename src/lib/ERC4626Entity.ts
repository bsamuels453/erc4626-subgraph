import { log, ethereum, BigInt, Address, Bytes } from '@graphprotocol/graph-ts';

import { 
  ERC20Token,
  ERC4626Vault as ERC4626Entity,
  ERC4626Vault,
  NonERC4626Contract as NonERC4626Entity
} from '../../generated/schema';
import { ERC4626 as ERC4626RPC } from '../../generated/ERC4626Vault/ERC4626'
import { getOrImportERC20 } from './ERC20Entity';

import { ERC4626Template } from '../../generated/templates';



export function isContractERC4626(address: Address): boolean {
  if(!doesContractImplement4626(address)) {
    return false;
  } else {
    // check if we've imported the entity
    let entity = ERC4626Entity.load(address);
    if( entity != null){
      return true
    } else {
      registerERC4626Vault(address);
      return true
    }
  }
}

/*
1. Creates a ERC4626Vault entity
2. Registers the ERC4626Token template against the vault address
Assumes ERC20Token entity already exists for the vault and its underlying.
Assumes validation checks have already been run against address for spec compliance.
*/
function registerERC4626Vault(address: Address): void {
  let token = ERC20Token.load(address);
  if(token === null){
    log.critical("Contract was not imported as an ERC20: {}", [address.toHexString()]);
    return;
  }

  let vaultRPC = ERC4626RPC.bind(address);

  let underlying = vaultRPC.asset();

  let vaultEntity = new ERC4626Vault(address);
  vaultEntity.underlying = underlying;
  vaultEntity.name = token.name;
  vaultEntity.symbol = token.symbol;
  vaultEntity.decimals = token.decimals;
  vaultEntity.save();

  ERC4626Template.create(address);
}
 

function markContractAsNon4626(address: Address): void {
  let entity = new NonERC4626Entity(address);
  entity.save();
}

function doesContractImplement4626(address: Address): boolean {
  // check if we've seen this contract before
  let cached = NonERC4626Entity.load(address);
  if(cached != null){
    return false;
  }

  // check if we've already imported the contract, thus it supports 4626
  let entity = ERC4626Entity.load(address);
  if(entity != null){
    return true;
  }

  // test various rpc methods
  let contract = ERC4626RPC.bind(address);
  
  // check methods that may never revert
  let asset = contract.try_asset();
  if(asset.reverted){
    log.warning("Contract not 4626 compliant, asset() reverted: {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  let convertToShares = contract.try_convertToShares(BigInt.fromI32(1));
  if(convertToShares.reverted) {
    log.warning("Contract not 4626 compliant, convertToShares(uint256) reverted: {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  let convertToAssets = contract.try_convertToAssets(BigInt.fromI32(1));
  if(convertToAssets.reverted) {
    log.warning("Contract not 4626 compliant, convertToAssets(uint256) reverted: {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  let totalAssets = contract.try_totalAssets();
  if(totalAssets.reverted) {
    log.warning("Contract not 4626 compliant, totalAssets() reverted: {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }
  let zero_address = Address.fromString("0x0000000000000000000000000000000000000000");

  let maxDeposit = contract.try_maxDeposit(zero_address);
  if(maxDeposit.reverted){
    log.warning("Contract not 4626 compliant, maxDeposit(address) reverted: {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  let maxWithdraw = contract.try_maxWithdraw(zero_address);
  if(maxWithdraw.reverted){
    log.warning("Contract not 4626 compliant, maxWithdraw(address) reverted: {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  let maxRedeem = contract.try_maxRedeem(zero_address);
  if(maxRedeem.reverted){
    log.warning("Contract not 4626 compliant, maxRedeem(address) reverted: {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  let maxMint = contract.try_maxMint(zero_address);
  if(maxMint.reverted){
    log.warning("Contract not 4626 compliant, maxMint(address) reverted: {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  // check if the underlying asset is a valid erc20
  let underlyingEntity = getOrImportERC20(asset.value);
  if(underlyingEntity == null){
    log.warning("Contract not 4626 compliant, underlying asset is not ERC20 compliant {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  // check if the contract itself is erc20 compliant
  let vaultToken = getOrImportERC20(address);
  if(vaultToken == null){
    log.warning("Contract not 4626 compliant as it fails to implement an ERC20 interface {}", [address.toHexString()]);
    markContractAsNon4626(address);
    return false;
  }

  return true;
}