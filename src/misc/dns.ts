import { getIpfs } from '../ipfs'


export function lookupTxtRecord(host: string): Promise<string> {
  return fetch(`https://cloudflare-dns.com/dns-query?name=${host}&type=TXT`, {
    headers: {
      "accept": "application/dns-json"
    }
  })
  .then(r => r.json())
  .then(r => r.Answer[0].data)
}


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

export default {
  lookupTxtRecord,
  lookupDnsLink
}
