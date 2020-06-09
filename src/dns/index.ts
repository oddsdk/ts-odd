import { getIpfs } from '../ipfs'


/**
 * Lookup a DNS TXT record.
 *
 * @param host The domain to get the TXT record from.
 * @returns Contents of the TXT record.
 */
export function lookupTxtRecord(host: string): Promise<string> {
  return fetch(`https://cloudflare-dns.com/dns-query?name=${host}&type=TXT`, {
    headers: {
      "accept": "application/dns-json"
    }
  })
  .then(r => r.json())
  .then(r => r.Answer[0].data)
  // remove double-quotes from beginning and end of the resulting string (if present)
  .then(r => r && r.replace(/^"+|"+$/g, ""))
}

/**
 * Lookup a DNSLink.
 *
 * @param host The domain to get the DNSLink from.
 * @returns Contents of the DNSLink with the "ipfs/" prefix removed.
 */
export async function lookupDnsLink(host: string): Promise<string> {
  const ipfs = await getIpfs()

  let t

  try {
    t = await ipfs.dns(host)
  } catch (_) {
    let prefixedHost

    prefixedHost = host.match(/^https?:\/\//) ? host : `https://${host}`
    prefixedHost = prefixedHost.includes("_dnslink.")
      ? prefixedHost
      : prefixedHost.replace("://", "://_dnslink.")

    t = await lookupTxtRecord(prefixedHost)
  }

  return t.replace(/^\/ipfs\//, "")
}
