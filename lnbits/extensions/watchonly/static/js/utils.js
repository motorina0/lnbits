const PSBT_BASE64_PREFIX = 'cHNidP8'
const COMMAND_PASSWORD = '/password'
const COMMAND_PASSWORD_CLEAR = '/password-clear'
const COMMAND_SEND_PSBT = '/psbt'
const COMMAND_SIGN_PSBT = '/sign'
const COMMAND_HELP = '/help'
const COMMAND_WIPE = '/wipe'
const COMMAND_SEED = '/seed'
const COMMAND_RESTORE = '/restore'
const COMMAND_CONFIRM_NEXT = '/confirm-next'
const COMMAND_CANCEL = '/cancel'
const COMMAND_XPUB = '/xpub'

const DEFAULT_RECEIVE_GAP_LIMIT = 20

const DEFAULT_RECEIVE_GAP_LIMIT = 20

const blockTimeToDate = blockTime =>
  blockTime ? moment(blockTime * 1000).format('LLL') : ''

const currentDateTime = () => moment().format('LLL')

const sleep = ms => new Promise(r => setTimeout(r, ms))

const retryWithDelay = async function (fn, retryCount = 0) {
  try {
    await sleep(25)
    // Do not return the call directly, use result.
    // Otherwise the error will not be cought in this try-catch block.
    const result = await fn()
    return result
  } catch (err) {
    if (retryCount > 100) throw err
    await sleep((retryCount + 1) * 1000)
    return retryWithDelay(fn, retryCount + 1)
  }
}

const txSize = tx => {
  // https://bitcoinops.org/en/tools/calc-size/
  // overhead size
  const nVersion = 4
  const inCount = 1
  const outCount = 1
  const nlockTime = 4
  const hasSegwit = !!tx.inputs.find(inp =>
    ['p2wsh', 'p2wpkh', 'p2tr'].includes(inp.accountType)
  )
  const segwitFlag = hasSegwit ? 0.5 : 0
  const overheadSize = nVersion + inCount + outCount + nlockTime + segwitFlag

  // inputs size
  const outpoint = 36 // txId plus vout index number
  const scriptSigLength = 1
  const nSequence = 4
  const inputsSize = tx.inputs.reduce((t, inp) => {
    const scriptSig =
      inp.accountType === 'p2pkh' ? 107 : inp.accountType === 'p2sh' ? 254 : 0
    const witnessItemCount = hasSegwit ? 0.25 : 0
    const witnessItems =
      inp.accountType === 'p2wpkh'
        ? 27
        : inp.accountType === 'p2wsh'
        ? 63.5
        : inp.accountType === 'p2tr'
        ? 16.5
        : 0
    t +=
      outpoint +
      scriptSigLength +
      nSequence +
      scriptSig +
      witnessItemCount +
      witnessItems
    return t
  }, 0)

  // outputs size
  const nValue = 8
  const scriptPubKeyLength = 1

  const outputsSize = tx.outputs.reduce((t, out) => {
    const type = guessAddressType(out.address)

    const scriptPubKey =
      type === 'p2pkh'
        ? 25
        : type === 'p2wpkh'
        ? 22
        : type === 'p2sh'
        ? 23
        : type === 'p2wsh'
        ? 34
        : 34 // default to the largest size (p2tr included)
    t += nValue + scriptPubKeyLength + scriptPubKey
    return t
  }, 0)

  return overheadSize + inputsSize + outputsSize
}
const guessAddressType = (a = '') => {
  if (a.startsWith('1') || a.startsWith('n')) return 'p2pkh'
  if (a.startsWith('3') || a.startsWith('2')) return 'p2sh'
  if (a.startsWith('bc1q') || a.startsWith('tb1q'))
    return a.length === 42 ? 'p2wpkh' : 'p2wsh'
  if (a.startsWith('bc1p') || a.startsWith('tb1p')) return 'p2tr'
}

const ACCOUNT_TYPES = {
  p2tr: 'Taproot, BIP86, P2TR, Bech32m',
  p2wpkh: 'SegWit, BIP84, P2WPKH, Bech32',
  p2sh: 'BIP49, P2SH-P2WPKH, Base58',
  p2pkh: 'Legacy, BIP44, P2PKH, Base58'
}

const getAccountDescription = type => ACCOUNT_TYPES[type] || 'nonstandard'

const readFromSerialPort = reader => {
  let partialChunk
  let fulliness = []

  const readStringUntil = async (separator = '\n') => {
    if (fulliness.length) return fulliness.shift().trim()
    const chunks = []
    if (partialChunk) {
      // leftovers from previous read
      chunks.push(partialChunk)
      partialChunk = undefined
    }
    while (true) {
      const {value, done} = await reader.read()
      if (value) {
        const values = value.split(separator)
        // found one or more separators
        if (values.length > 1) {
          chunks.push(values.shift()) // first element
          partialChunk = values.pop() // last element
          fulliness = values // full lines
          return {value: chunks.join('').trim(), done: false}
        }
        chunks.push(value)
      }
      if (done) return {value: chunks.join('').trim(), done: true}
    }
  }
  return readStringUntil
}

function satOrBtc(val, showUnit = true, showSats = false) {
  const value = showSats
    ? LNbits.utils.formatSat(val)
    : val == 0
    ? 0.0
    : (val / 100000000).toFixed(8)
  if (!showUnit) return value
  return showSats ? value + ' sat' : value + ' BTC'
}

function loadTemplateAsync(path) {
  const result = new Promise(resolve => {
    const xhttp = new XMLHttpRequest()

    xhttp.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) resolve(this.responseText)

        if (this.status == 404) resolve(`<div>Page not found: ${path}</div>`)
      }
    }

    xhttp.open('GET', path, true)
    xhttp.send()
  })

  return result
}

function findAccountPathIssues(path = '') {
  const p = path.split('/')
  if (p[0] !== 'm') return "Path must start with 'm/'"
  for (let i = 1; i < p.length; i++) {
    if (p[i].endsWith('')) p[i] = p[i].substring(0, p[i].length - 1)
    if (isNaN(p[i])) return `${p[i]} is not a valid value`
  }
}

///////////////
let ivHex = '000102030405060708090a0b0c0d0e0f'
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (c = 0; c < hex.length; c += 2)
    bytes[c / 2] = parseInt(hex.substr(c, 2), 16)
  return bytes
}
function bytesToHex(bytes) {
  for (var hex = [], i = 0; i < bytes.length; i++) {
    var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]
    hex.push((current >>> 4).toString(16))
    hex.push((current & 0xf).toString(16))
  }
  return hex.join('')
}
function asciiToUint8Array(str) {
  var chars = []
  for (var i = 0; i < str.length; ++i) {
    chars.push(str.charCodeAt(i))
  }
  return new Uint8Array(chars)
}
async function encryptMessage2(key, text) {
  console.log('### key', bytesToHex(key))
  iv = new Uint8Array([
    0x00,
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    0x07,
    0x08,
    0x09,
    0x0a,
    0x0b,
    0x0c,
    0x0d,
    0x0e,
    0x0f
  ])
  var textBytes = aesjs.utils.utf8.toBytes(text)
  console.log('### textBytes2', bytesToHex(textBytes))
  console.log('### iv', bytesToHex(iv))

  var aesCbc = new aesjs.ModeOfOperation.cbc(key, iv)
  var encryptedBytes = aesCbc.encrypt(textBytes)

  // To print or store the binary data, you may convert it to hex
  var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes)
  return encryptedHex
}

async function encryptMessage(key, message) {
  // The iv must never be reused with a given key.
  // iv = window.crypto.getRandomValues(new Uint8Array(16));
  iv = new Uint8Array([
    0x00,
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    0x07,
    0x08,
    0x09,
    0x0a,
    0x0b,
    0x0c,
    0x0d,
    0x0e,
    0x0f
  ])
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv
    },
    key,
    message
  )

  console.log('### #####################################')
  return new Uint8Array(ciphertext)
}

async function decryptMessage(key, ciphertext) {
  iv = new Uint8Array([
    0x00,
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    0x07,
    0x08,
    0x09,
    0x0a,
    0x0b,
    0x0c,
    0x0d,
    0x0e,
    0x0f
  ])

  let decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv
    },
    key,
    new Uint8Array(ciphertext)
  )

  return decrypted
}

// TODO: weak: must re-check
// from https://stackoverflow.com/a/51838635/9014097
function toStdBase64(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  var pad = input.length % 4
  if (pad) {
    input += new Array(5 - pad).join('=')
  }
  return input
}

// TODO: weak: must re-check
function base64ToHex(str) {
  const raw = atob(str)
  let result = ''
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16)
    result += hex.length === 2 ? hex : '0' + hex
  }
  return result.toUpperCase()
}

function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
}

// Alice private key
// 359A8CA1418C49DD26DC7D92C789AC33347F64C6B7789C666098805AF3CC60E5

// Bob private key
// AB52F1F981F639BD83F884703BC690B10DB709FF48806680A0D3FBC6475E6093
