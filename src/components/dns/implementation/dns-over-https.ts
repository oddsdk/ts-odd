import { Implementation } from "../implementation.js"


// FUNDAMENTALS


/**
 * Lookup DNS TXT record using Google DNS-over-HTTPS
 *
 * @param domain The domain to get the TXT record from.
 * @returns Contents of the TXT record.
 */
export async function googleLookup(domain: string): Promise<string | null> {
  return dnsOverHttps(`https://dns.google/resolve?name=${domain}&type=txt`)
}

/**
 * Lookup DNS TXT record using Cloudflare DNS-over-HTTPS
 *
 * @param domain The domain to get the TXT record from.
 * @returns Contents of the TXT record.
 */
export function cloudflareLookup(domain: string): Promise<string | null> {
  return dnsOverHttps(`https://cloudflare-dns.com/dns-query?name=${domain}&type=txt`)
}

/**
 * Lookup a DNS TXT record.
 *
 * If there are multiple records, they will be joined together.
 * Records are sorted by a decimal prefix before they are joined together.
 * Prefixes have a format of `001;` → `999;`
 *
 * @param url The DNS-over-HTTPS endpoint to hit.
 * @returns Contents of the TXT record.
 */
export function dnsOverHttps(url: string): Promise<string | null> {
  return fetch(url, {
    headers: {
      "accept": "application/dns-json"
    }
  })
    .then(r => r.json())
    .then(r => {
      if (r.Answer) {
        // Remove double-quotes from beginning and end of the resulting string (if present)
        const answers: Array<string> = r.Answer.map((a: { data: string }) => {
          return (a.data || "").replace(/^"+|"+$/g, "")
        })

        // Sort by prefix, if prefix is present,
        // and then add the answers together as one string.
        if (answers[ 0 ][ 3 ] === ";") {
          return answers
            .sort((a, b) => a.slice(0, 4).localeCompare(b.slice(0, 4)))
            .map(a => a.slice(4))
            .join("")

        } else {
          return answers.join("")

        }

      } else {
        return null

      }
    })
}



// 🛠


/**
 * Lookup a DNS TXT record.
 *
 * Race lookups to Google & Cloudflare, return the first to finish
 *
 * @param domain The domain to get the TXT record from.
 * @returns Contents of the TXT record.
 */
export async function lookupTxtRecord(domain: string): Promise<string | null> {
  return Promise.any([
    googleLookup(domain),
    cloudflareLookup(domain)
  ])
}

/**
 * Lookup a DNSLink.
 *
 * @param domain The domain to get the DNSLink from.
 * @returns Contents of the DNSLink with the "ipfs/" prefix removed.
 */
export async function lookupDnsLink(domain: string): Promise<string | null> {
  const txt = await lookupTxtRecord(
    domain.startsWith("_dnslink.")
      ? domain
      : `_dnslink.${domain}`
  )

  return txt && !txt.includes("/ipns/")
    ? txt.replace(/^dnslink=/, "").replace(/^\/ipfs\//, "")
    : null
}



// 🛳️


export function implementation(): Implementation {
  return {
    lookupDnsLink,
    lookupTxtRecord
  }
}
