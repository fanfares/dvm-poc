const levels = ["info", "warn", "error"]

let level = process.env.VITE_LOG_LEVEL

export const setLevel = l => {
  level = l
}

export const info = (...message) => {
  if (!level || levels.indexOf(level) <= levels.indexOf("info")) {
    console.log(...message)
  }
}

export const warn = (...message) => {
  if (!level || levels.indexOf(level) <= levels.indexOf("warn")) {
    console.warn(...message)
  }
}

export const error = (...message) => {
  if (!level || levels.indexOf(level) <= levels.indexOf("error")) {
    console.error(...message)
  }
}

export default {info, warn, error, setLevel}
