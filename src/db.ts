import { log } from './util/string'
import readline from 'readline'
import fs from 'fs'

// This is a basic file-based implementation which can be used as-is or replaced with a connection to a production database

// check if the zapped npub and/or event qualify according to our database
export function checkZap(zappedUser:string, zappedEvent: string, zapAmount: string, messageHandler: (message: string) => void, noMatch?: () => void) {
  let found = false
  let lineReader = readline.createInterface({
    input: fs.createReadStream(`${process.env.DB_DIR||'db'}/${zappedUser}`)
  })
  lineReader.on('line', function (line: string) {
    if (found) return
    let id: string, amount: string, message: string, rest: string[]
    [id, amount, ...rest] = line.split(' '); message = rest.join(' ')
    if (id == zappedEvent
    || (id == 'default' && !!zappedEvent)
    || (id == 'profile' && !zappedEvent)) {
      if (parseInt(zapAmount) >= parseInt(amount)) {
        found = true
        log('MATC', `message to send: ${message}`)
        messageHandler?.(message)
      } else {
        log('ATTN', `zap matched but did not meet trigger threshold of ${amount}`)
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
