import { ethereum, BigInt } from "@graphprotocol/graph-ts";
import { CostBasisLot, ERC4626Vault } from "../../generated/schema";
import { buildEventId, convertTokenToDecimal } from "../Util";
import { getERC20orFail } from "./ERC20Entity";

export function createCostBasisEntity(
  vault: ERC4626Vault,
  tokensDeposited: BigInt,
  sharesMinted: BigInt,
  event: ethereum.Event
): CostBasisLot {
  let sharesMintedNorm = convertTokenToDecimal(sharesMinted, vault.decimals);

  let underlying = getERC20orFail(vault.underlying);
  let tokensDepositedNorm = convertTokenToDecimal(
    tokensDeposited,
    underlying.decimals
  );

  let costBasis = new CostBasisLot(buildEventId(event));
  costBasis.block = event.block.number;
  costBasis.sharesInLot = sharesMintedNorm;
  costBasis.tokensInLot = tokensDepositedNorm;
  costBasis.unconsumedShares = sharesMintedNorm;
  costBasis.pricePerShare = tokensDepositedNorm.div(sharesMintedNorm);
  costBasis.save();
  return costBasis;
}
