import 'dotenv/config'
import { log } from './util/string'
import { initMaintenance, checkMaintenance, cutoff, seenZaps } from './checkMaintenance'
import { processZap } from './processZap'
import { watchForZaps } from './watchForZaps'
import fs from 'fs'

log('INIT', '-- start --')

if (!process.env.DVM_NSEC_HEX) {
  log('INIT', `cannot send DMs: no DVM_NSEC_HEX private key specified in .env or environment variable`)
} else {
  fs.mkdir(`${process.env.DB_DIR||'db'}/npub`, { recursive: true }, (err) => { if (err) log('INIT', 'error on DB_DIR: ' + err) })

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

      processZap(url, zapReceipt)
    })
  })
}

log('INIT', 'main thread exit')
