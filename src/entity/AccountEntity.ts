import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { Account, AccountPosition, ERC4626Vault } from "../../generated/schema";

export function getOrCreateAccount(address: Address): Account {
  let account = Account.load(address);
  if (account != null) {
    return account;
  } else {
    account = new Account(address);
    account.save();
    return account;
  }
}

export function getOrCreateAccountPosition(
  vault: ERC4626Vault,
  account: Account
): AccountPosition {
  let id = account.id.concat(vault.id);

  let accountPosition = AccountPosition.load(id);
  if (accountPosition != null) {
    return accountPosition;
  } else {
    accountPosition = new AccountPosition(id);
    accountPosition.vault = vault.id;
    accountPosition.account = account.id;
    accountPosition.shares = BigDecimal.zero();
    accountPosition.unconsumedLots = [];
    accountPosition.earnings = [];
    accountPosition.save();
    return accountPosition;
  }
}
