import { log } from '../../util/string'

const levels = ["info", "warn", "error"]

let level = process.env.VITE_LOG_LEVEL

export const setLevel = l => {
  level = l
}

export const info = (...message) => {
  if (!level || levels.indexOf(level) <= levels.indexOf("info")) {
    log('CORC', message.join(' '))
  }
}

export const warn = (...message) => {
  if (!level || levels.indexOf(level) <= levels.indexOf("warn")) {
    log('CORC', 'WARNING: ' + message.join(' '))
  }
}

export const error = (...message) => {
  if (!level || levels.indexOf(level) <= levels.indexOf("error")) {
    log('CORC', 'ERROR: ' + message.join(' '))
  }
}

export default {info, warn, error, setLevel}
