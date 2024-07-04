import { markAsSeen } from './maintenance'
import { checkZap } from './db'
import { respondToPurchase } from './purchase'
import { log, bolt11amount, humanReadableAge } from './util/string'

// id precisions for logging
const WAL_PREC = +(process.env.WAL_PREC || 2)
const USER_PREC = +(process.env.USER_PREC || 4)
const EVENT_PREC = +(process.env.EVENT_PREC || 3)

let counter = 0

export function handleZap(url: string, zapReceipt: any) {
  markAsSeen(zapReceipt)

  // the request
  const zapRequest = JSON.parse(zapReceipt.tags.filter((e: any) => e[0] == 'description')[0]?.[1])
  zapReceipt.tags = zapReceipt.tags.filter((e: any) => e[0] != 'description') // remove the extracted request from the receipt to avoid data duplication

  // the recipient
  const recipient = zapRequest.tags.filter((e: any) => e[0] == 'p')[0]?.[1]

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
  log('ZAAP', `${++counter}. ${url} ` + 
    zapReceipt.pubkey.substring(0, WAL_PREC) + ': ' + 
    zapRequest.pubkey.substring(0, USER_PREC) + ' z-> ' + 
    recipient.substring(0, USER_PREC) + ' ' + 
    amount.padStart(5,' ') + ' for ' + 
    zappedEvent?.substring(0, EVENT_PREC) + ' ' + 
    '(' + humanReadableAge(zapReceipt.created_at) + ' ago)')

  // print details for debugging
  if (zapRequest.pubkey == recipient) log('NOTE', 'self-zap')
  //if (!zappedEvent) console.log('', JSON.stringify(zapRequest) + '\n', JSON.stringify(zapReceipt))

  checkZap(amount, zappedEvent, (message) => {
    respondToPurchase(zapRequest.pubkey, message)
  })
}
