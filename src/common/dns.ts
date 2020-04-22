import ipfs from '../ipfs'


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
  let t

  try {
    t = await ipfs.dns(host)
  } catch (_) {
    t = await lookupTxtRecord(host)
  }

  return t.replace(/^\/ipfs\//, "")
}
