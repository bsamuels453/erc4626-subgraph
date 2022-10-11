import { ERC4626Vault, VaultTVLMeasurement } from "../../generated/schema";
import { ERC4626 as ERC4626RPC } from "../../generated/ERC4626Vault/ERC4626";
import {
  Address,
  BigDecimal,
  Bytes,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";
import { convertTokenToDecimal } from "../Util";
import { getERC20orFail } from "./ERC20Entity";

export function updateTVLMetrics(
  vault: ERC4626Vault,
  event: ethereum.Event
): void {
  let rpc = ERC4626RPC.bind(Address.fromBytes(vault.id));

  let call = rpc.try_totalAssets();
  if (call.reverted) {
    log.error(
      "Call to vault.totalAssets() reverted. Implies vault is not 4626 compliant. Ignoring for now. Vault: {}  TxHash: {}",
      [vault.id.toHexString(), event.transaction.hash.toHexString()]
    );
    return;
  }

  let underlying = getERC20orFail(vault.underlying);
  let totalAssetsBigInt = call.value;
  let totalAssetsDecimal = convertTokenToDecimal(
    totalAssetsBigInt,
    underlying.decimals
  );

  let measurement = createOrUpdateTvlMeasurement(
    vault,
    totalAssetsDecimal,
    event
  );
  vault.latestTVLMeasurement = measurement.id;
  vault.assetTvl = totalAssetsDecimal;
  vault.save();
}

function getTvlMeasurementId(vaultId: Bytes, event: ethereum.Event): Bytes {
  return vaultId.concat(event.block.hash);
}

function createOrUpdateTvlMeasurement(
  vault: ERC4626Vault,
  assets: BigDecimal,
  event: ethereum.Event
): VaultTVLMeasurement {
  let id = getTvlMeasurementId(vault.id, event);

  let measurement = VaultTVLMeasurement.load(id);
  if (measurement != null) {
    measurement.reportedAssets = assets;
    measurement.save();
    return measurement;
  } else {
    let newMeasurement = new VaultTVLMeasurement(id);
    newMeasurement.vault = vault.id;
    newMeasurement.block = event.block.number;
    newMeasurement.timestamp = event.block.timestamp;
    newMeasurement.reportedAssets = assets;
    newMeasurement.save();
    return newMeasurement;
  }
}
