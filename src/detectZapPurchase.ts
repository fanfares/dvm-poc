import { checkZapRecipient, checkZapEvent, checkZapProfile } from './db'
import { sendDM } from './sendDM'

export function detectZapPurchase(purchaser: string, zapRecipient: string, zappedEvent: string, amount: string, relays: any) {
  checkZapRecipient(zapRecipient, zappedEvent, amount, (message) => {
    sendDM(purchaser, message, relays)
  }, () => {
    checkZapEvent(zappedEvent, amount, (message) => {
      sendDM(purchaser, message, relays)
    }, () => {
      checkZapProfile(zapRecipient, amount, (message) => {
        sendDM(purchaser, message, relays)
      })
    })
  })
}
