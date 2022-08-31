import {
  Address,
  BigDecimal,
  ethereum,
  log,
  BigInt,
} from "@graphprotocol/graph-ts";
import {
  Account,
  CostBasisLot,
  ERC4626Vault,
  ERC20Token as ERC20Entity,
  ERC4626Vault as ERC4626Entity,
  DepositEvent,
  TransferEvent,
} from "../generated/schema";
import { getOrCreateAccountPosition } from "./entity/AccountEntity";
import { getERC20orFail } from "./entity/ERC20Entity";
import { buildEventId, convertTokenToDecimal } from "./Util";

export function updateAccountForDeposit(
  vault: ERC4626Vault,
  owner: Account,
  costBasis: CostBasisLot
): void {
  let accountPosition = getOrCreateAccountPosition(owner, vault);

  accountPosition.shares = accountPosition.shares.plus(costBasis.sharesInLot);

  let unconsumedLots = accountPosition.unconsumedLots;
  unconsumedLots.push(costBasis.id);
  accountPosition.unconsumedLots = unconsumedLots;

  accountPosition.save();
}
