# ERC-4626 Subgraph

This subgraph indexes the deposit & withdrawal activity of all [ERC4626-compliant](https://eips.ethereum.org/EIPS/eip-4626) vaults.

It can be used to query an account's earnings, vault TVL statistics, and more.

## Querying

## Example Queries

### Querying information about an account

- For an account, show all vaults account is currently invested in
- For an account, show all deposit, withdraw, and transfer transactions for a specific vault.
- For an account, show how much they have earned on their withdrawals for a specific vault.

### Querying information about a vault

- Show all of the vaults for a specific asset, ordered by TVL.
- Show the top 5 vaults by TVL gain over the past week.

## Notes for ERC4626 Vault Developers

### Vault Detection

The subgraph detects new ERC4626 vaults by listening for ERC4626-specified deposit & withdraw events. Once detected, a series of contract calls are issued to verify whether the contract is ERC4626 compliant. The precise series of calls can be found in `function doesContractImplement4626(address: Address)`.

### Extending the subgraph
