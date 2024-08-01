# Zapwatcher DVM Proof of Concept

This digital vending machine (DVM) watches for public zaps and compares them to it’s database. If a known user and/or event is zapped and the zap amount meets the required threshold, a direct message (DM) is sent to the purchaser. The database is created and maintained externally to this DVM (i.e., by https://github.com/fanfares/storage-dvm-poc).

## How to run it

- `git clone https://github.com/fanfares/zapwatcher-dvm-poc`
- `cd zapwatcher-dvm-poc`
- `yarn install`
- `yarn ts-node src/index.ts`

## About

- built using Coracle’s [Welshman](https://github.com/coracle-social/welshman) libraries and simplified DM code

## Known Issues

- subscriptions do not recover after network glitches, necessitating a re-start of the app

