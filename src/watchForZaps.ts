import { log } from './util/string'
const { subscribe, executeSubscriptionBatched } = require('@welshman/net')

export function watchForZaps(handler: (url: string, zapReceipt: any, dups: number) => void) {
  const relays = (process.env.WATCH_RELAYS||'relay.fanfares.io').split(',').map(e => e.startsWith('wss://')?e:'wss://'+e)
  log('DEBG', `relays: ${JSON.stringify(relays)}`)
  const sub = subscribe({
    relays,
    filters: [{
      kinds: [9735 /* zap receipt */],
    }],
    // timeout: 60/*seconds*/ * 1000/*milliseconds*/,
  })
  
  let dups = 0
  sub.emitter.on('eose', (url: string) => {
    log('SUBS', `eose: ${url}`)
  })
  sub.emitter.on('close', (url: string) => {
    log('SUBS', `close: ${url}`)
  })
  sub.emitter.on('complete', () => {
    log('SUBS', `complete; re-executing subscription`)
    executeSubscriptionBatched(sub) // this keeps things running most of the time, but not across internet outages it seems
  })
  sub.emitter.on('duplicate', (url: string, e: any) => {
    dups++ // log('SUBS', `duplicate: ${url}, ${JSON.stringify(e)}`)
  })
  sub.emitter.on('deleted-event', (url: string, e: any) => {
    log('SUBS', `deleted-event: ${url}, ${JSON.stringify(e)}`)
  })
  sub.emitter.on('failed-filter', (url: string, e: any) => {
    log('SUBS', `failed-filter: ${url}, ${JSON.stringify(e)}`)
  })
  sub.emitter.on('invalid-signature', (url: string, e: any) => {
    log('SUBS', `invalid-signature: ${url}, ${JSON.stringify(e)}`)
  })
  sub.emitter.on('event', (url: string, zapReceipt: any) => {
    handler(url, zapReceipt, dups)
    dups = 0
  })
}

