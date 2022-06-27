const blockTimeToDate = blockTime =>
  blockTime ? moment(blockTime * 1000).format('LLL') : ''

const sleep = ms => new Promise(r => setTimeout(r, ms))
