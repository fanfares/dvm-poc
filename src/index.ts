import { log } from './util/string'
import { initMaintenance, checkMaintenance, cutoff, seenZaps } from './maintenance'
import { handleZap } from './zaps'
import { watchForZaps } from './subscription'

require('dotenv').config()

log('INIT', '-- start --')

initMaintenance(() => {

  let cutoff_skips = 0
  let seen_skips = 0

  watchForZaps((url, zapReceipt, dups) => {
    checkMaintenance()

    // ignore old/seen zaps
    if (zapReceipt.created_at < cutoff) {
      cutoff_skips++
      return
    }
    if (seenZaps.includes(zapReceipt.id)) {
      seen_skips++
      return
    }

    // log brief info when applicable
    if (cutoff_skips + seen_skips + dups > 0) {
      log('NOTE', `skipped ${cutoff_skips} old, ${seen_skips} seen, and ${dups} duplicate event(s)`)
      cutoff_skips = 0
      seen_skips = 0
    }

    handleZap(url, zapReceipt)
  })
})

log('INIT', 'main thread exit')
