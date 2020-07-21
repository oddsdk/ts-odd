[Fission SDK](../README.md) › ["dns/index"](_dns_index_.md)

# Module: "dns/index"

## Index

### Functions

* [lookupDnsLink](_dns_index_.md#lookupdnslink)
* [lookupTxtRecord](_dns_index_.md#lookuptxtrecord)

## Functions

###  lookupDnsLink

▸ **lookupDnsLink**(`domain`: string): *Promise‹string | null›*

*Defined in [src/dns/index.ts:54](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/dns/index.ts#L54)*

Lookup a DNSLink.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`domain` | string | The domain to get the DNSLink from. |

**Returns:** *Promise‹string | null›*

Contents of the DNSLink with the "ipfs/" prefix removed.

___

###  lookupTxtRecord

▸ **lookupTxtRecord**(`domain`: string): *Promise‹string | null›*

*Defined in [src/dns/index.ts:14](https://github.com/fission-suite/ts-sdk/blob/c2e76a7/src/dns/index.ts#L14)*

Lookup a DNS TXT record.

If there are multiple records, they will be joined together.
Records are sorted by a decimal prefix before they are joined together.
Prefixes have a format of `001;` → `999;`

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`domain` | string | The domain to get the TXT record from. |

**Returns:** *Promise‹string | null›*

Contents of the TXT record.
