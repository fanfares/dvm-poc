const { now } = require('@welshman/lib')
const { createEvent } = require('@welshman/util')
const { subscribe, executeSubscriptionBatched } = require('@welshman/net')
import { bolt11amount, humanReadableAge } from './util/string'
import * as fs from 'fs';
const readline = require('readline');

require('dotenv').config()

/*
  Theory of operation

  1. Trust subscription library not to produce duplicate events in a single session.
  2. Log newly seen events to be remembered in case of re-start.
  3. Maintain a cutoff date and screen old events by it.

  Using the above rules, we stay time, memory, and disk efficient.
*/

// anything younger than this value will be checked against the seen list
// anything older than double this value will surely be ignored
// anything in between could tip either way
const CUTOFF_THRESHOLD = +(process.env.CUTOFF_THRESHOLD || 30) // minutes

// id precisions for logging
const WAL_PREC = +(process.env.WAL_PREC || 2)
const USER_PREC = +(process.env.USER_PREC || 4)
const EVENT_PREC = +(process.env.EVENT_PREC || 3)

function log(code: string, message: string) {
  console.log(`${new Date().toISOString()} [${code}] ${message}`)
}

log('INIT', '-- start --')
let newest = Math.floor(new Date().valueOf() / 1000)
let cutoff = 0
try {
  cutoff = +fs.readFileSync('cutoff','utf8')
} catch (e) {
  if (e instanceof Error) {
    console.warn(e.message)
  }
}
log('INIT', `cutoff: ${cutoff} newest: ${newest} (${humanReadableAge(newest - cutoff)})`)

log('INIT', 'loading seen ids...')
let seen: string[] = []
let total = 0
let lineReader = require('readline').createInterface({
  input: require('fs').createReadStream('seen')
})
lineReader.on('line', function (line: string) {
  total++
  const parts = line.split(' ')
  if ((+parts[0]) >= cutoff) {
    seen.push(parts[1])
  }
})
lineReader.on('close', function () {
  log('INIT', `remembering ${seen.length}/${total} seen ids; begin subscription`)
  const sub = subscribe({
    relays: ['wss://relay.wavlake.com', 'wss://relay.satoshidnc.com'],
    filters: [{
      kinds: [9735 /* zap receipt */],
    }],
    // timeout: 60/*seconds*/ * 1000/*milliseconds*/,
  })

  let counter = 0
  let cutoff_skips = 0
  let seen_skips = 0
  let dups = 0
  sub.emitter.on('eose', (url: string) => {
    log('SUBS', `eose: ${url}`)
  })
  sub.emitter.on('close', (url: string) => {
    log('SUBS', `close: ${url}`)
  })
  sub.emitter.on('complete', () => {
    log('SUBS', `complete; re-executing subscription`)
    executeSubscriptionBatched(sub)
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

    // maintenance operations
    let now = Math.floor(new Date().valueOf() / 1000)
    if (now - CUTOFF_THRESHOLD * 60 > newest) { // if 30 minutes have passed
      newest = now
      cutoff = now - CUTOFF_THRESHOLD * 60
      fs.writeFileSync('cutoff', ''+cutoff, { encoding: "utf8" })
      log('MANT', `update cutoff: ${cutoff} newest: ${newest} (${humanReadableAge(newest - cutoff)})`)
      let total = 0
      let copied = 0
      try {
        fs.unlinkSync('seen~')
      } catch (e) {
      }
      log('MANT', `rotating seen file`)
      try {
        fs.renameSync('seen', 'seen~')
      } catch (e) {
        if (e instanceof Error) {
          console.error(e.message)
        }
      }
      let lineReader = require('readline').createInterface({
        input: require('fs').createReadStream('seen~')
      })
      lineReader.on('line', function (line: string) {
        total++
        const parts = line.split(' ')
        if ((+parts[0]) >= cutoff) {
          copied++
          fs.writeFileSync('seen', `${line}\n`, { encoding: "utf8", flag: "a+", mode: 0o666, })
        }
      })
      lineReader.on('close', function () {
        log('MANT', `kept ${copied}/${total} seen ids`)
        try {
          fs.unlinkSync('seen~')
        } catch (e) {
          if (e instanceof Error) {
            console.warn(e.message)
          }
        }
      })
    }
    if (zapReceipt.created_at < cutoff) {
      cutoff_skips++
      return
    }
    if (seen.includes(zapReceipt.id)) {
      seen_skips++
      return
    }
    if (cutoff_skips + seen_skips + dups > 0) {
      log('NOTE', `skipped ${cutoff_skips} old, ${seen_skips} seen, and ${dups} duplicate event(s)`)
      cutoff_skips = 0
      seen_skips = 0
      dups = 0
    }

    // remembrance file
    fs.writeFileSync('seen', `${zapReceipt.created_at} ${zapReceipt.id}\n`, { encoding: "utf8", flag: "a+", mode: 0o666, })

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
    
    // print the summary line
    log('ZAAP', `${++counter}. ${url} ` + 
      zapReceipt.pubkey.substring(0, WAL_PREC) + ': ' + 
      zapRequest.pubkey.substring(0, USER_PREC) + ' z-> ' + 
      recipient.substring(0, USER_PREC) + ' ' + 
      amount.padStart(5,' ') + ' for ' + 
      zappedEvent?.substring(0, EVENT_PREC) + ' ' + 
      '(' + humanReadableAge(now - zapReceipt.created_at) + ' ago)')

    // print details for debugging
    if (zapRequest.pubkey == recipient) log('NOTE', 'self-zap')
    //if (!zappedEvent) console.log('', JSON.stringify(zapRequest) + '\n', JSON.stringify(zapReceipt))
  })
})

log('INIT', 'main thread exit')
