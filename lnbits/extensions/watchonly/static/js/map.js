const mapAddresses = function (obj) {
  obj._data = _.clone(obj)
  obj.date = obj.time
    ? Quasar.utils.date.formatDate(
        new Date(obj.time * 1000),
        'YYYY-MM-DD HH:mm'
      )
    : ''
  return obj
}

const mapInputToSentHistory = (tx, addressData, vin) => ({
  sent: true,
  txId: tx.txid,
  address: addressData.address,
  isChange: addressData.branch_index === 1,
  amount: vin.prevout.value,
  date: blockTimeToDate(tx.status.block_time),
  height: tx.status.block_height,
  confirmed: tx.status.confirmed,
  fee: tx.fee,
  expanded: false
})

const mapOutputToReceiveHistory = (tx, addressData, vout) => ({
  received: true,
  txId: tx.txid,
  address: addressData.address,
  isChange: addressData.branch_index === 1,
  amount: vout.value,
  date: blockTimeToDate(tx.status.block_time),
  height: tx.status.block_height,
  confirmed: tx.status.confirmed,
  fee: tx.fee,
  expanded: false
})

const mapUtxoToTxInput = utxo => ({
  txid: utxo.txId,
  vout: utxo.vout,
  amount: utxo.amount,
  address: utxo.address,
  branch_index: utxo.branch_index,
  address_index: utxo.address_index,
  master_fingerprint: utxo.master_fingerprint,
  txHex: ''
})

const mapToAddressUtxo = (wallet, addressData, utxo) => ({
  id: addressData.id,
  address: addressData.address,
  isChange: addressData.branch_index === 1,
  address_index: addressData.address_index,
  branch_index: addressData.branch_index,
  wallet: addressData.wallet,
  master_fingerprint: wallet.fingerprint,
  txId: utxo.txid,
  vout: utxo.vout,
  confirmed: utxo.status.confirmed,
  amount: utxo.value,
  date: blockTimeToDate(utxo.status?.block_time),
  sort: utxo.status?.block_time,
  expanded: false,
  selected: false
})

const mapWalletAccount = function (obj) {
  obj._data = _.clone(obj)
  obj.date = obj.time
    ? Quasar.utils.date.formatDate(
        new Date(obj.time * 1000),
        'YYYY-MM-DD HH:mm'
      )
    : ''
  obj.label = obj.title
  return obj
}
