const blockTimeToDate = blockTime =>
  blockTime ? moment(blockTime * 1000).format('LLL') : ''

const sleep = ms => new Promise(r => setTimeout(r, ms))

const ACCOUNT_TYPES = {
  p2tr: 'Taproot, BIP86, P2TR, Bech32m',
  p2wpkh: 'SegWit, BIP84, P2WPKH, Bech32',
  p2sh: 'BIP49, P2SH-P2WPKH, Base58',
  p2pkh: 'Legacy, BIP44, P2PKH, Base58'
}

const getAccountDescription = type => ACCOUNT_TYPES[type] || 'nonstandard'
