import { getEventHash, getPublicKey as getPk } from 'nostr-tools'
import {schnorr} from "@noble/curves/secp256k1"
import {equals} from "ramda"
import {tryFunc} from "hurdak"
import logger from "./logger"

/* This file is mostly copy-and-pasted from other sources, with light adaptation */

export type NostrConnectHandler = {
  pubkey?: string
  domain?: string
  relays?: string[]
}

export type Session = {
  method: string
  pubkey: string
  privkey?: string
  connectKey?: string
  connectToken?: string
  connectHandler?: NostrConnectHandler
  settings?: Record<string, any>
  settings_updated_at?: number
  groups_last_synced?: number
  notifications_last_synced?: number
  //groups?: Record<string, GroupStatus>
  onboarding_tasks_completed?: string[]
}

export const memoize = <T>(f: (...args: any[]) => T) => {
  let prevArgs
  let result: T

  return (...args) => {
    if (!equals(prevArgs, args)) {
      prevArgs = args
      result = f(...args)
    }

    return result
  }
}

export function isBytes(a: unknown): a is Uint8Array {
  return (
    a instanceof Uint8Array ||
    (a != null && typeof a === 'object' && a.constructor.name === 'Uint8Array')
  );
}
function abytes(b: Uint8Array | undefined, ...lengths: number[]) {
  if (!isBytes(b)) throw new Error('Uint8Array expected');
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error(`Uint8Array expected of length ${lengths}, not of length=${b.length}`);
}
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0')
)
export function bytesToHex(bytes: Uint8Array): string {
  abytes(bytes);
  // pre-caching improves the speed 6x
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}

export const fromHex = k => Uint8Array.from(Buffer.from(k, "hex"))
export const getPublicKey = (sk: string) => getPk(fromHex(sk))
export const getSignature = (e, sk: string) => bytesToHex(schnorr.sign(getEventHash(e), sk))

export const tryJson = <T>(f: () => T) =>
  tryFunc(f, (e: Error) => {
    if (!e.toString().includes("JSON")) {
      logger.warn(e)
    }
  })

