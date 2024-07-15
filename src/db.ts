import { log } from './util/string'
import readline from 'readline'
import fs from 'fs'

// This is a crude provisionary implementation to be optimized with a real database later

// check if the zapped npub and event are in our database
export function checkZapRecipient(zappedUser:string, zappedEvent: string, zapAmount: string, messageHandler: (message: string) => void, noMatch?: () => void) {
  let found = false
  let lineReader = readline.createInterface({
    input: fs.createReadStream(`${process.env.DB_DIR||'db'}/npub/${zappedUser}`)
  })
  lineReader.on('line', function (line: string) {
    let id: string, amount: string, message: string, rest: string[]
    [id, amount, ...rest] = line.split(' '); message = rest.join(' ')
    if (id == zappedEvent) {
      log('PURC', `zap matches recipient npub and event id`)
      if (parseInt(zapAmount) >= parseInt(amount)) {
        found = true
        log('PURC', `message to send: ${message}`)
        messageHandler?.(message)
      } else {
        log('ATTN', `but did not meet trigger threshold of ${amount}`)
      }
    }
  })
  lineReader.on('close', function () {
    if (!found) noMatch?.()
  })
  lineReader.on('error', function(err) {
    if (err.code != 'ENOENT') log('EROR', JSON.stringify(err))
    if (!found) noMatch?.()
  })
}

// check if the zapped profile is in our database
export function checkZapProfile(zappedUser:string, zapAmount: string, messageHandler: (message: string) => void, noMatch?: () => void) {
  let found = false
  let lineReader = readline.createInterface({
    input: fs.createReadStream(`${process.env.DB_DIR||'db'}/profiles`)
  })
  lineReader.on('line', function (line: string) {
    let id: string, amount: string, message: string, rest: string[]
    [id, amount, ...rest] = line.split(' '); message = rest.join(' ')
    if (id == zappedUser) {
      log('PURC', `zap matches recipient npub`)
      if (parseInt(zapAmount) >= parseInt(amount)) {
        found = true
        log('PURC', `message to send: ${message}`)
        messageHandler?.(message)
      } else {
        log('ATTN', `but did not meet trigger threshold of ${amount}`)
      }
    }
  })
  lineReader.on('close', function () {
    if (!found) noMatch?.()
  })
  lineReader.on('error', function(err) {
    if (err.code != 'ENOENT') log('EROR', JSON.stringify(err))
    if (!found) noMatch?.()
  })
}

// check if the zapped event is in our database
export function checkZapEvent(zappedEvent: string, zapAmount: string, messageHandler: (message: string) => void, noMatch?: () => void) {
  let found = false
  let lineReader = readline.createInterface({
    input: fs.createReadStream(`${process.env.DB_DIR||'db'}/events`)
  })
  lineReader.on('line', function (line: string) {
    let id: string, amount: string, message: string, rest: string[]
    [id, amount, ...rest] = line.split(' '); message = rest.join(' ')
    if (id == zappedEvent) {
      log('PURC', `zap matches event id`)
      if (parseInt(zapAmount) >= parseInt(amount)) {
        found = true
        log('PURC', `message to send: ${message}`)
        messageHandler?.(message)
      } else {
        log('ATTN', `but did not meet trigger threshold of ${amount}`)
      }
    }
  })
  lineReader.on('close', function () {
    if (!found) noMatch?.()
  })
  lineReader.on('error', function(err) {
    if (err.code != 'ENOENT') log('EROR', JSON.stringify(err))
    if (!found) noMatch?.()
  })
}
