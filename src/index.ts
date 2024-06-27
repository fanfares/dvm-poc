const { now } = require('@welshman/lib')
const { createEvent } = require('@welshman/util')
const { subscribe } = require('@welshman/net')
import { bolt11amount } from './util/string'

require('dotenv').config()

const tags = []

const sub = subscribe({
  relays: ["wss://relay.wavlake.com"],
  filters: [{
    kinds: [9735 /* zap receipt */],
    limit: 10,
  }],
})

console.log('Hello, world!')
console.log(JSON.stringify(sub))

var counter = 0

sub.emitter.on('event', (url: string, zapReceipt: any) => {

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
  const amount = a1 && (a1 / 1000 + ' ') || amountTryHarder()

  // the event
  const eventTryHarder = () => {
    const a = zapRequest.tags.filter((e: any) => e[0] == 'a')[0]?.[1]
    return a && a.substring(0, 8) + '*'
  }
  const e1 = zapRequest.tags.filter((e: any) => e[0] == 'e')[0]?.[1]
  const zappedEvent = e1 || eventTryHarder()
  
  // print the summary line
  console.log(++counter + '. ' + url + ' ' + 
    zapReceipt.pubkey.substring(0, 8) + ' says ' + 
    zapRequest.pubkey.substring(0,8) + ' paid ' + 
    amount.padStart(5,' ') + ' to ' + 
    recipient.substring(0,8) + ' for ' + 
    zappedEvent?.substring(0,8))

  // print details for debugging
  if (!zappedEvent) console.log('', JSON.stringify(zapRequest) + '\n', JSON.stringify(zapReceipt))
})

console.log('Goodbye')
