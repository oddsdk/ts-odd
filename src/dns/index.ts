import { get as getIpfs } from '../ipfs'


/**
 * Lookup a DNS TXT record.
 *
 * If there are multiple records, they will be joined together.
 * Records are sorted by a decimal prefix before they are joined together.
 * Prefixes have a format of `001;` → `999;`
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
      // Remove double-quotes from beginning and end of the resulting string (if present)
      const answers: Array<string> = r.Answer.map((a: { data: string }) => {
        return (a.data || "").replace(/^"+|"+$/g, "")
      })

      // Sort by prefix, if prefix is present,
      // and then add the answers together as one string.
      if (answers[0][3] === ";") {
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

/**
 * Lookup a DNSLink.
 *
 * @param domain The domain to get the DNSLink from.
 * @returns Contents of the DNSLink with the "ipfs/" prefix removed.
 */
export async function lookupDnsLink(domain: string): Promise<string | null> {
  const ipfs = await getIpfs()

  let t

  try {
    t = ipfs.dns
      ? await ipfs.dns(domain)
      : await lookupDnsLinkWithCloudflare(domain)

  } catch (err) {
    if (err.name === "HTTPError") {
      t = await lookupDnsLinkWithCloudflare(domain)
    } else {
      throw(err)
    }

  }

  return t && !t.includes("/ipns/")
    ? t.replace(/^dnslink=/, "").replace(/^\/ipfs\//, "")
    : null
}



// ㊙️


function lookupDnsLinkWithCloudflare(domain: string): Promise<string | null> {
  return lookupTxtRecord(
    domain.startsWith("_dnslink.")
    ? domain
    : `_dnslink.${domain}`
  )
}
