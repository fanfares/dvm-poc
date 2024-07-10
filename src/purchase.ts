import { Nip44 } from './util/coracle/nip44'
import { Connect } from './util/coracle/connect'
import { getPublicKey } from './util/coracle/misc'
import { log } from './util/string'

export function respondToPurchase(buyer: string, message: string) {
  log('PURC', `message to ${buyer}: ${message}`)

  // const session = {
  //   method: 'privkey',
  //   pubkey: buyer,
  //   relays: ['relay.fanfares.io'],
  //   connectHandler: 
  // }


  let session: any
  const loginWithPrivateKey = (privkey: string, extra = {}) =>
    session = {method: "privkey", pubkey: getPublicKey(privkey), privkey, ...extra}
  loginWithPrivateKey('596812b100c487c0c3646e7e3a523688cb8c5d3e87b4ffdbf240dad7903033e9')

  if (!session) { log('PURC', `error: no session`); return }
  log('PURC', `sender pubkey: ${session.pubkey}`)
  //const nip44 = new Nip44(session, new Connect(session))
}
