import { Bytes, log, ethereum, BigDecimal, BigInt } from '@graphprotocol/graph-ts';
import {
  Deposit,
  Withdraw,
  Transfer
} from '../generated/ERC4626Vault/ERC4626';
import { 
  CostBasisLot,
  ERC20Token as ERC20Entity,
  ERC4626Vault as ERC4626Entity,
  ERC4626Vault,
  NonERC4626Contract as NonERC4626Entity
} from '../generated/schema';
import { getOrCreateAccount, getOrCreateAccountPosition } from './lib/AccountEntity';
import { isContractERC4626 } from './lib/ERC4626Entity';
import { buildEventId, convertTokenToDecimal } from './util';


export function handleDepositEvent(event: Deposit): void {
  if(!isContractERC4626(event.address)){
    return;
  }

  // check if this deposit is anomalous
  if(event.params.assets == BigInt.zero()){
    log.info("Deposit of 0 assets, skipping tx: {}", [event.transaction.hash.toHexString()]);
    return;
  } 
  if (event.params.shares == BigInt.zero()){
    log.info("Deposit of 0 shares, skipping tx: {}", [event.transaction.hash.toHexString()]);
    return;
  }

  let vault = ERC4626Entity.load(event.address);
  if(vault == null){
    log.critical("No Vault entity for {}", [event.address.toHexString()]);
    return;
  }

  let sharesMintedNorm = convertTokenToDecimal(event.params.shares, vault.decimals)
  let underlying = ERC20Entity.load(vault.underlying);
  if(underlying == null){
    log.critical("No ERC20 entity for {}", [vault.underlying.toHexString()]);
    return;
  }
  let tokensDepositedNorm = convertTokenToDecimal(event.params.assets, underlying.decimals)

  let costBasis = new CostBasisLot(buildEventId(event));
  costBasis.sharesInLot = sharesMintedNorm;
  costBasis.sharesConsumed = BigDecimal.zero();
  costBasis.pricePerShare = tokensDepositedNorm.div(sharesMintedNorm);
  costBasis.save();

  // sep func?
  let account = getOrCreateAccount(event.params.owner);
  let accountPosition = getOrCreateAccountPosition(account, vault);

  accountPosition.shares = accountPosition.shares.plus(costBasis.sharesInLot);
  
  let unconsumedLots = accountPosition.unconsumedLots;
  unconsumedLots.push(costBasis.id);
  accountPosition.unconsumedLots = unconsumedLots;

  accountPosition.save();



  // createUserDeposit(...)
  // updateVaultMetrics(...)
}

export function handleWithdrawEvent(event: Withdraw): void {
  // datasource is garaunteed to be a valid vault, don't bother checking
}

export function handleTransferEvent(event: Transfer): void {
  // datasource is garaunteed to be a valid vault, don't bother checking
}