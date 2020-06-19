import { getIpfs } from '../ipfs'


/**
 * Lookup a DNS TXT record.
 *
 * If there are multiple records, they will be joined together.
 *
 * @param domain The domain to get the TXT record from.
 * @returns Contents of the TXT record.
 */
export function lookupTxtRecord(domain: string): Promise<string | null> {
  return fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT`, {
    headers: {
      "accept": "application/dns-json"
    }
  })
  .then(r => r.json())
  .then(r => {
    if (r.Answer) {
      // Join all answers.
      // Also remove double-quotes from beginning and end of the resulting string (if present)
      return r.Answer.map((a: { data: string }) => {
        return a.data && a.data.replace(/^"+|"+$/g, "")
      }).join("")
    } else {
      return null
    }
  })
}

/**
 * Lookup a DNSLink.
 *
 * @param domain The domain to get the DNSLink from.
 * @returns Contents of the DNSLink with the "ipfs/" prefix removed.
 */
export async function lookupDnsLink(domain: string): Promise<string> {
  const ipfs = await getIpfs()

  let t

  try {
    t = await ipfs.dns(domain)
  } catch (_) {
    t = await lookupTxtRecord(
      domain.startsWith("_dnslink.")
      ? domain
      : `_dnslink.${domain}`
    )
  }

  return (t || "").replace(/^\/ipfs\//, "")
}
