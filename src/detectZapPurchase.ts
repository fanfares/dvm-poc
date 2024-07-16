import { checkZap } from './db'
import { sendDM } from './sendDM'

export function detectZapPurchase(purchaser: string, zapRecipient: string, zappedEvent: string, amount: string, relays: any) {
  checkZap(zapRecipient, zappedEvent, amount, (message) => {
    sendDM(purchaser, message, relays)
  })
}
