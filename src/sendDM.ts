import { Nip44 } from './util/coracle/nip44'
import { Nip59 } from './util/coracle/nip59'
import { Connect } from './util/coracle/connect'
import { Signer } from './util/coracle/signer'
import { getPublicKey } from './util/coracle/misc'
import { log } from './util/string'
import { createEvent } from '@welshman/util'
import { publish } from '@welshman/net'
import crypto from "crypto"


/* Aim: NIP-17-compliant direct messages sent using NIP 44 encryption and NIP 59 gift wrapping. */

export function sendDM(buyer: string, message: string, relays) {
  log('DEBG', `buyer pubkey: ${buyer}`)

  if (!process.env.DVM_NSEC_HEX) return // error is already reported once during INIT

  const randomSK = crypto.randomBytes(32).toString('hex')
  const randomPK = getPublicKey(randomSK)
  log('DEBG', `delivery-boy pubkey: ${randomPK}`)


  // The following section initializes the code borrowed from Coracle

  let session: any
  const loginWithPrivateKey = (privkey: string, extra = {}) =>
    session = {method: "privkey", pubkey: getPublicKey(privkey), privkey, ...extra}
  loginWithPrivateKey(process.env.DVM_NSEC_HEX)
  if (!session) { log('PURC', `error: no session`); return }
  if (session.pubkey != getPublicKey(process.env.DVM_NSEC_HEX)) log('DEBG', `DVM pubkey: ${getPublicKey(process.env.DVM_NSEC_HEX)}`)
  log('DEBG', `sender pubkey: ${session.pubkey}`)

  let connect = new Connect(session)
  // if (!connect.isEnabled()) log('DEBG', `connect enabled ${connect.isEnabled()}`)

  const nip44 = new Nip44(session, connect)
  if (!nip44.isEnabled()) log('DEBG', `nip44 enabled ${nip44.isEnabled()}`)

  const signer = new Signer(session, connect)
  if (!signer.isEnabled()) log('DEBG', `signer enabled ${signer.isEnabled()}`)

  const nip59 = new Nip59(session, nip44, signer)


  // Create the gift-wrapped, encrypted message

  nip59.wrap(
    createEvent(
      14,
      {
        content: message,
        tags: [
          ['p', buyer, relays[0]], // TODO: fill in according to NIP-17
          ['subject', 'content delivery'],
        ]
      }
    ), {
      author: null, // kind 14 sender, defaults to DVM secret key
      wrap: {
        author: randomSK, // kind 1059 sender, secret key, should be random
        recipient: buyer
      }
    }
  ).then(value => {
    const { wrap, ...templ } = value


    /* This would be unwrapped again as follows:

    log('DEBG', `wrap result ${JSON.stringify(wrap)}`)
    nip59.unwrap(wrap, buyerSK).then(value => {
      const { wrap, ...unwrap } = value
      log('DEBG', `unwrap result ${JSON.stringify(unwrap)}`)
    }, reason => {
      log('DEBG', `unwrap failed ${JSON.stringify(reason)}`)
    })

    */


    // Determine which relays to send over

    log('DEBG', `relays ${JSON.stringify(relays)}`)

    
    // Send the message

    let sent = 0
    const pub = publish({ event: wrap, relays })
    pub.emitter.on("*", t => {
      // log('EVNT', JSON.stringify(t))
      // log('SENT', JSON.stringify(pub))
      // if (!sent++) log('SENT', `message: ${message}`)
      sent++
    })
    setTimeout(() => log('PURC', `DM sent x${sent}`), 5000)
  })
}
