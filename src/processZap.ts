import { markAsSeen } from './checkMaintenance'
import { detectZapPurchase } from './detectZapPurchase'
import { log, bolt11amount, humanReadableTiming } from './util/string'

// id precisions for logging
const WAL_PREC = +(process.env.WAL_PREC || 2)
const USER_PREC = +(process.env.USER_PREC || 3)
const EVENT_PREC = +(process.env.EVENT_PREC || 4)

export function processZap(url: string, zapReceipt: any) {
  markAsSeen(zapReceipt)

  // the request
  const zapRequest = JSON.parse(zapReceipt.tags.filter((e: any) => e[0] == 'description')[0]?.[1])
  zapReceipt.tags = zapReceipt.tags.filter((e: any) => e[0] != 'description') // remove the extracted request from the receipt to avoid data duplication

  // the zap recipient
  const zappedUser = zapRequest.tags.filter((e: any) => e[0] == 'p')[0]?.[1]

  // the amount
  const amountTryHarder = () => {
    const a = bolt11amount(zapReceipt.tags.filter((e: any) => e[0] == 'bolt11')[0]?.[1])
    return a && a + '*'
  }
  const a1 = zapRequest.tags.filter((e: any) => e[0] == 'amount')[0]?.[1]
  const amount = (a1 && (a1 / 1000 + ' ')) || amountTryHarder()

  // the event
  const eventTryHarder = () => {
    const a = zapRequest.tags.filter((e: any) => e[0] == 'a')[0]?.[1]
    return a && a.substring(0, EVENT_PREC) + '*'
  }
  const e1 = zapRequest.tags.filter((e: any) => e[0] == 'e')[0]?.[1]
  const zappedEvent = e1 || eventTryHarder()
  
  // log a summary line
  log('ZAAP',
    zapReceipt.pubkey.substring(0, WAL_PREC) + ': ' + 
    zapRequest.pubkey.substring(0, USER_PREC) + ' z-> ' + 
    zappedUser.substring(0, USER_PREC) + ' ' + 
    amount.padStart(5,' ') + ' for ' + 
    zappedEvent?.substring(0, EVENT_PREC) + ' (' + 
    humanReadableTiming(zapReceipt.created_at) + ') ' +
    url)

  // print details for debugging
  if (zapRequest.pubkey == zappedUser) log('NOTE', 'self-zap')
  // if (!zappedEvent) log('DEBG', '', JSON.stringify(zapRequest) + '\n', JSON.stringify(zapReceipt))

  // the relays to which the zap receipt was presumably sent
  const relays = zapRequest.tags.filter(e => e[0] == 'relays')[0].slice(1)

  detectZapPurchase(zapRequest.pubkey, zappedUser, zappedEvent, amount, relays)
}
