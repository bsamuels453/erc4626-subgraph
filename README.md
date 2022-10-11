# ERC-4626 Subgraph

This subgraph indexes the deposit & withdrawal activity of all [ERC4626-compliant](https://eips.ethereum.org/EIPS/eip-4626) vaults.

It can be used to query an account's earnings, vault TVL statistics, and more.


- [ERC-4626 Subgraph](#erc-4626-subgraph)
  - [Deployments](#deployments)
  - [Querying information about an account](#querying-information-about-an-account)
    - [For an account, show all outstanding vault positions](#for-an-account-show-all-outstanding-vault-positions)
    - [For a given account, show all deposit, withdraw, and transfer transactions the account has made with a vault.](#for-a-given-account-show-all-deposit-withdraw-and-transfer-transactions-the-account-has-made-with-a-vault)
    - [Show how much an account has earned by withdrawing from a specific vault.](#show-how-much-an-account-has-earned-by-withdrawing-from-a-specific-vault)
    - [For a given transaction, display all of the ERC4626 deposit, withdraw, and transfer events.](#for-a-given-transaction-display-all-of-the-erc4626-deposit-withdraw-and-transfer-events)
  - [Querying information about a vault](#querying-information-about-a-vault)
    - [Show all of the vaults for a specific asset, ordered by TVL.](#show-all-of-the-vaults-for-a-specific-asset-ordered-by-tvl)
  - [Developing](#developing)
    - [Installation](#installation)
  - [Notes for ERC4626 Vault Developers](#notes-for-erc4626-vault-developers)
    - [Vault Detection](#vault-detection)
  - [Errata/Compatibility issues](#erratacompatibility-issues)
    - [Proxy upgraded vaults](#proxy-upgraded-vaults)
    - [Implicitly immutable fields](#implicitly-immutable-fields)
  - [Disclaimers](#disclaimers)

## Deployments

Ethereum Mainnet - [Deployment](https://thegraph.com/hosted-service/subgraph/bsamuels453/erc4626) - [Explorer](https://api.thegraph.com/subgraphs/name/bsamuels453/erc4626/graphql)

## Querying information about an account

### For an account, show all outstanding vault positions

[Try it](https://api.thegraph.com/subgraphs/name/bsamuels453/erc4626/graphql?query=%7B%0A++accountPositions%28%0A++++block%3A+%7Bnumber%3A+15576819%7D%2C%0A++++where%3A+%7Baccount%3A+%220x1efe1b6b3a172b9dc814599a6800b5d818e8f147%22%7D%0A++%29+%7B%0A++++vault+%7B%0A++++++id%0A++++++name%0A++++++underlying+%7B%0A++++++++name%0A++++++%7D%0A++++%7D%0A++++shares%0A++%7D%0A%7D)

```
{
  accountPositions(
    where: {account: "0xaccountaddress", shares_gt: 0}
  ) {
    vault {
      id
      name
      underlying {
        name
      }
    }
    shares
  }
}
```

### For a given account, show all deposit, withdraw, and transfer transactions the account has made with a vault.

[Try it](https://api.thegraph.com/subgraphs/name/bsamuels453/erc4626/graphql?query=%7B%0A++transferEvents%28%0A++++where%3A+%7Breceiver%3A+%220x78befca7de27d07dc6e71da295cc2946681a6c7b%22%2C+vault%3A+%220x30647a72dc82d7fbb1123ea74716ab8a317eac19%22%7D%0A++++orderBy%3A+block%0A++++orderDirection%3A+desc%0A++%29+%7B%0A++++block%0A++++sharesTransferred%0A++++transaction+%7B%0A++++++id%0A++++%7D%0A++%7D%0A++depositEvents%28%0A++++where%3A+%7Baccount%3A+%220x78befca7de27d07dc6e71da295cc2946681a6c7b%22%2C+vault%3A+%220x30647a72dc82d7fbb1123ea74716ab8a317eac19%22%7D%0A++++orderBy%3A+block%0A++++orderDirection%3A+desc%0A++%29+%7B%0A++++id%0A++++block%0A++++assetsDeposited%0A++++sharesMinted%0A++%7D%0A++withdrawEvents%28%0A++++where%3A+%7Baccount%3A+%220x78befca7de27d07dc6e71da295cc2946681a6c7b%22%2C+vault%3A+%220x30647a72dc82d7fbb1123ea74716ab8a317eac19%22%7D%0A++++orderBy%3A+block%0A++++orderDirection%3A+desc%0A++%29+%7B%0A++++id%0A++++block%0A++++assetsWithdrawn%0A++++sharesRedeemed%0A++%7D%0A%7D)

```
{
  transferEvents(
    where: {receiver: "0xaccountaddress", vault: "0xvaultaddress"}
    orderBy: block
    orderDirection: desc
  ) {
    block
    sharesTransferred
  }
  depositEvents(
    where: {account: "0xaccountaddress", vault: "0xvaultaddress"}
    orderBy: block
    orderDirection: desc
  ) {
    id
    block
    assetsDeposited
    sharesMinted
  }
  withdrawEvents(
    where: {account: "0xaccountaddress", vault: "0xvaultaddress"}
    orderBy: block
    orderDirection: desc
  ) {
    id
    block
    assetsWithdrawn
    sharesRedeemed
  }
}
```

### Show how much an account has earned by withdrawing from a specific vault.

[Try it](https://api.thegraph.com/subgraphs/name/bsamuels453/erc4626/graphql?query=%7B%0A++accountPositions%28%0A++++where%3A+%7Baccount%3A+%220x78befca7de27d07dc6e71da295cc2946681a6c7b%22%2C+vault%3A+%220x30647a72dc82d7fbb1123ea74716ab8a317eac19%22%7D%0A++%29+%7B%0A++++earnings%28orderBy%3A+block%2C+orderDirection%3A+asc%29+%7B%0A++++++block%0A++++++sharesRedeemed%0A++++++assetsWithdrawn%0A++++++profit%0A++++%7D%0A++%7D%0A%7D)

```
{
  accountPositions(
    where: {account: "0xaccountaddress", vault: "0xvaultaddress"}
  ) {
    earnings(orderBy: block, orderDirection: asc) {
      block
      sharesRedeemed
      assetsWithdrawn
      profit
    }
  }
}
```

### For a given transaction, display all of the ERC4626 deposit, withdraw, and transfer events.

[Try it](https://api.thegraph.com/subgraphs/name/bsamuels453/erc4626/graphql?query=%7B%0A++transaction%28%0A++++id%3A+%220x03fdc908bfd42f8fcdf449f3a4f0dcdf77d97e26bb70f5d4a69e7c77e564a7c4%22%0A++%29+%7B%0A++++block%0A++++timestamp%0A++++depositEvents+%7B%0A++++++logIndex%0A++++++account+%7B%0A++++++++id%0A++++++%7D%0A++++++vault+%7B%0A++++++++name%0A++++++%7D%0A++++++assetsDeposited%0A++++++sharesMinted%0A++++%7D%0A++++withdrawEvents+%7B%0A++++++logIndex%0A++++++account+%7B%0A++++++++id%0A++++++%7D%0A++++++vault+%7B%0A++++++++name%0A++++++%7D%0A++++++assetsWithdrawn%0A++++++sharesRedeemed%0A++++%7D%0A++++transferEvents+%7B%0A++++++logIndex%0A++++++sender+%7B%0A++++++++id%0A++++++%7D%0A++++++receiver+%7B%0A++++++++id%0A++++++%7D%0A++++++vault+%7B%0A++++++++name%0A++++++%7D%0A++++++sharesTransferred%0A++++%7D%0A++%7D%0A%7D)

```
{
  transaction(
    id: "0xtransactionid"
  ) {
    block
    timestamp
    depositEvents {
      logIndex
      account {
        id
      }
      vault {
        name
      }
      assetsDeposited
      sharesMinted
    }
    withdrawEvents {
      logIndex
      account {
        id
      }
      vault {
        name
      }
      assetsWithdrawn
      sharesRedeemed
    }
    transferEvents {
      logIndex
      sender {
        id
      }
      receiver {
        id
      }
      vault {
        name
      }
      sharesTransferred
    }
  }
}
```

## Querying information about a vault

### Show all of the vaults for a specific asset, ordered by TVL.

[Try it](https://api.thegraph.com/subgraphs/name/bsamuels453/erc4626/graphql?query=%7B%0A++erc4626Vaults%28%0A++++where%3A%7Bunderlying%3A+%220xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2%22%7D%2C%0A++++orderBy%3A+assetTvl%0A++++orderDirection%3A+desc%0A++%29+%7B%0A++++id%0A++++name%0A++++firstBlock%0A++++assetTvl%0A++%7D%0A%7D)

```
{
  erc4626Vaults(
    where:{underlying: "0xunderlyingTokenAddress"},
    orderBy: assetTvl
    orderDirection: desc
  ) {
    id
    name
    firstBlock
    assetTvl
  }
}
```

## Developing

### Installation

`make install`

Make changes to `.env` file as needed

Check out the makefile for build/deployment actions.

## Notes for ERC4626 Vault Developers

### Vault Detection

The subgraph detects new ERC4626 vaults by listening for ERC4626-specified deposit & withdraw events. Once detected, a series of contract calls are issued to verify whether the contract is ERC4626 compliant. The precise series of calls can be found in `function doesContractImplement4626(address: Address)`.

## Errata/Compatibility issues

### Proxy upgraded vaults

If a protocol uses a proxy for its non-ERC4626 vaults, and later migrates to ERC4626, the subgraph will fail to account for user's deposits/withdraw activity before the migration. Users whose deposits occurred after the migration will not have any issues.

Protocols Impacted:
- mStable

### Implicitly immutable fields

Some fields defined by the ERC4626 spec are _expected_, but not required, to be immutable. The vault's `name`, `asset`, and `decimals` fall under this category. If a vault changes these fields as part of their normal operation,  delayed initialziation, or proxy implementation, the subgraph will fail to index those vaults properly.

Protocols Impacted:
- Sommelier

## Disclaimers