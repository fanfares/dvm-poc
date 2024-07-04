import { log } from './util/string'

// This is a crude provisionary implementation to be optimized later

// check if an event is in our database
export function checkZap(zappedEvent: string, zapAmount: string, messageHandler: (message: string) => void) {
  let lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('db')
  })
  lineReader.on('line', function (line: string) {
    const parts = line.split(' ')
    if (parts[0] == zappedEvent) {
      if (parseInt(zapAmount) >= parseInt(parts[1])) {
        log('ATTN', `purchase detected: ${parts[2]}`)
        messageHandler(parts[2])
      } else {
        log('ATTN', `zap did not meet trigger threshold of ${parts[1]}`)
      }
    }
  })
  lineReader.on('close', function () {
    // not found
  })
}
