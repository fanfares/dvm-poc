import { log, humanReadableAge } from './util/string'
import * as fs from 'fs'

/*
  Theory of operation

  1. Trust subscription library not to produce duplicate events in a single session.
  2. Log newly seen event ids to be remembered in case of re-start.
  3. Maintain a cutoff date and screen old events by it.

  Using the above rules, we stay time, memory, and disk efficient.
*/

// anything younger than this value will be checked against the seen list
// anything older than double this value will surely be ignored
// anything in between could tip either way
const CUTOFF_THRESHOLD = +(process.env.CUTOFF_THRESHOLD || 30) // minutes

let newest = Math.floor(new Date().valueOf() / 1000)
export let cutoff = 0
export let seenZaps: string[] = []

export function initMaintenance(readyHandler: () => void) {
  try {
    cutoff = +fs.readFileSync('cutoff','utf8')
  } catch (e) {
    if (e instanceof Error) {
      console.warn(e.message)
    }
  }
  log('INIT', `cutoff: ${cutoff} newest: ${newest} (${humanReadableAge(cutoff, newest)})`)
  
  log('INIT', 'loading seen ids...')
  let total = 0
  let lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('seen')
  })
  lineReader.on('line', function (line: string) {
    total++
    const parts = line.split(' ')
    if ((+parts[0]) >= cutoff) {
      seenZaps.push(parts[1])
    }
  })
  lineReader.on('close', function () {
    log('INIT', `remembering ${seenZaps.length}/${total} seen ids; begin subscription`)
    readyHandler()
  })
}

export function checkMaintenance() {
  // maintenance operations
  let now = Math.floor(new Date().valueOf() / 1000)
  if (now - CUTOFF_THRESHOLD * 60 > newest) { // if 30 minutes have passed
    newest = now
    cutoff = now - CUTOFF_THRESHOLD * 60
    fs.writeFileSync('cutoff', ''+cutoff, { encoding: "utf8" })
    log('MANT', `update cutoff: ${cutoff} newest: ${newest} (${humanReadableAge(cutoff, newest)})`)
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
}

export function markAsSeen(zapReceipt: any) {
  fs.writeFileSync('seen', `${zapReceipt.created_at} ${zapReceipt.id}\n`, { encoding: "utf8", flag: "a+", mode: 0o666, })
}
