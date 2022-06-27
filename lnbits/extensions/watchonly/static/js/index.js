const sleep = ms => new Promise(r => setTimeout(r, ms))

Vue.component(VueQrcode.name, VueQrcode)

Vue.filter('reverse', function (value) {
  // slice to make a copy of array, then reverse the copy
  return value.slice().reverse()
})
const locationPath = [
  window.location.protocol,
  '//',
  window.location.hostname,
  window.location.pathname
].join('')

const mapWalletLink = function (obj) {
  obj._data = _.clone(obj)
  obj.date = obj.time
    ? Quasar.utils.date.formatDate(
        new Date(obj.time * 1000),
        'YYYY-MM-DD HH:mm'
      )
    : ''
  const mP = obj.masterpub || ''
  obj.label = obj.title
  return obj
}

const blockTimeToDate = blockTime =>
  blockTime ? moment(blockTime * 1000).format('LLL') : ''

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

const watchonlyTables = {
  WalletsTable: {
    columns: [
      {
        name: 'title',
        align: 'left',
        label: 'Title',
        field: 'title'
      },
      {
        name: 'type',
        align: 'left',
        label: 'Type',
        field: 'type'
      },
      {name: 'id', align: 'left', label: 'ID', field: 'id'},
      {
        name: 'masterpub',
        align: 'left',
        label: 'MasterPub',
        field: 'masterpub'
      }
    ],
    pagination: {
      rowsPerPage: 10
    }
  },
  UtxoTable: {
    columns: [
      {
        name: 'expand',
        align: 'left',
        label: ''
      },
      {
        name: 'selected',
        align: 'left',
        label: ''
      },
      {
        name: 'status',
        align: 'center',
        label: 'Status',
        sortable: true
      },
      {
        name: 'address',
        align: 'left',
        label: 'Address',
        field: 'address',
        sortable: true
      },
      {
        name: 'amount',
        align: 'left',
        label: 'Amount',
        field: 'amount',
        sortable: true
      },
      {
        name: 'date',
        align: 'left',
        label: 'Date',
        field: 'date',
        sortable: true
      },
      {
        name: 'wallet',
        align: 'left',
        label: 'Account',
        field: 'wallet',
        sortable: true
      }
    ],
    pagination: {
      rowsPerPage: 10
    },
    uxtosFilter: ''
  },
  PaymentTable: {
    columns: [
      {
        name: 'data',
        align: 'left'
      }
    ],
    pagination: {
      rowsPerPage: 10
    }
  },
  AddressesTable: {
    columns: [
      {
        name: 'actions',
        align: 'left',
        label: '',
        field: 'actions'
      },
      {
        name: 'address',
        align: 'left',
        label: 'Address',
        field: 'address',
        sortable: true
      },
      {
        name: 'amount',
        align: 'left',
        label: 'Amount',
        field: 'amount',
        sortable: true
      },
      {
        name: 'note',
        align: 'left',
        label: 'Note',
        field: 'note',
        sortable: true
      },
      {
        name: 'wallet',
        align: 'left',
        label: 'Account',
        field: 'wallet',
        sortable: true
      }
    ],
    pagination: {
      rowsPerPage: 0,
      sortBy: 'amount',
      descending: true
    },
    addressesFilter: ''
  },

  HistoryTable: {
    columns: [
      {
        name: 'expand',
        align: 'left',
        label: ''
      },
      {
        name: 'status',
        align: 'left',
        label: 'Status'
      },
      {
        name: 'amount',
        align: 'left',
        label: 'Amount',
        field: 'amount',
        sortable: true
      },
      {
        name: 'address',
        align: 'left',
        label: 'Address',
        field: 'address',
        sortable: true
      },
      {
        name: 'date',
        align: 'left',
        label: 'Date',
        field: 'date',
        sortable: true
      }
    ],
    pagination: {
      rowsPerPage: 0,
      sortBy: 'date',
      descending: true
    },
    addressesFilter: ''
  }
}

new Vue({
  el: '#vue',
  mixins: [windowMixin],
  data: function () {
    return {
      filter: '',
      balance: null,
      scan: {
        scanning: false,
        scanCount: 0,
        scanIndex: 0
      },

      walletLinks: [],

      currentAddress: null,

      tab: 'addresses',
      addresses: {
        show: false,
        data: [],
        history: [],
        selectedWallet: null,
        note: '',
        filterOptions: [
          'Show Change Addresses',
          'Show Gap Addresses',
          'Only With Amount'
        ],
        filterValues: []
      },
      utxos: {
        data: [],
        total: 0,
        sats: true
      },
      payment: {
        data: [{address: '', amount: undefined}],
        changeWallet: null,
        changeAddress: '',
        feeRate: 1,
        psbtBase64: '',
        utxoSelectionModes: [
          'Manual',
          'Random',
          'Smaller Inputs First',
          'Larger Inputs First'
        ],
        utxoSelectionMode: 'Manual',
        show: false,
        showAdvanced: false
      },
      mempool: {
        endpoint: ''
      },

      formDialog: {
        show: false,
        data: {}
      },

      qrCodeDialog: {
        show: false,
        data: null
      },

      ...watchonlyTables
    }
  },

  methods: {
    getWalletName: function (walletId) {
      const wallet = this.walletLinks.find(wl => wl.id === walletId)
      return wallet ? wallet.title : 'unknown'
    },
    getFilteredAddresses: function () {
      const selectedWalletId = this.addresses.selectedWallet?.id
      const filter = this.addresses.filterValues || []
      const includeChangeAddrs = filter.includes('Show Change Addresses')
      const includeGapAddrs = filter.includes('Show Gap Addresses')
      const excludeNoAmount = filter.includes('Only With Amount')

      const walletsLimit = this.walletLinks.reduce((r, w) => {
        r[`_${w.id}`] = w.address_no
        return r
      }, {})

      const addresses = this.addresses.data.filter(
        a =>
          (includeChangeAddrs || a.branch_index === 0) &&
          (includeGapAddrs ||
            a.branch_index === 1 ||
            a.address_index <= walletsLimit[`_${a.wallet}`]) &&
          !(excludeNoAmount && a.amount === 0) &&
          (!selectedWalletId || a.wallet === selectedWalletId)
      )
      return addresses
    },
    deletePaymentAddress: function (v) {
      const index = this.payment.data.indexOf(v)
      if (index !== -1) {
        this.payment.data.splice(index, 1)
      }
    },
    initPaymentData: function () {
      if (!this.payment.show) return

      this.payment.changeWallet = this.walletLinks[0]
      // temp solution
      const changeAddress = this.addresses.data.filter(
        a => a.wallet === this.payment.changeWallet.id
      )
      this.payment.changeAddress = changeAddress.pop().address
      this.payment.showAdvanced = false
    },
    addPaymentAddress: function () {
      this.payment.data.push({address: '', amount: undefined})
    },
    getTotalPaymentAmount: function () {
      const total = this.payment.data.reduce((t, a) => t + (a.amount || 0), 0)
      return this.satBtc(total)
    },
    getTotalUtxoAmount: function () {
      const total = this.utxos.data.reduce((t, a) => t + (a.amount || 0), 0)
      return this.satBtc(total)
    },
    createTransaction: async function () {
      const wallet = this.g.user.wallets[0] // todo: find active wallet
      try {
        const tx = {
          fee_rate: this.payment.feeRate,
          masterpubs: this.walletLinks.map(w => w.masterpub)
        }
        tx.inputs = this.utxos.data
          .filter(utxo => utxo.selected)
          .map(mapUtxoToTxInput)
        tx.outputs = this.payment.data.map(out => ({
          address: out.address,
          amount: out.amount
        }))

        for (const input of tx.inputs) {
          input.tx_hex = await this.fetchTxHex(input.txid)
        }

        const {data} = await LNbits.api.request(
          'POST',
          '/watchonly/api/v1/psbt',
          wallet.adminkey,
          tx
        )

        this.payment.psbtBase64 = data
      } catch (err) {
        console.log('### err', err)
      }
    },
    getFilteredAddressesHistory: function () {
      return this.addresses.history
        .filter(a => !a.isChange)
        .sort((a, b) => (!a.height ? -1 : b.height - a.height))
    },
    fetchTxHex: async function (txId, retryCount = 0) {
      const {
        bitcoin: {transactions: transactionsAPI}
      } = mempoolJS()
      try {
        return await transactionsAPI.getTxHex({txid: txId})
      } catch (err) {
        if (retryCount > 10) throw err
        await sleep((retryCount + 1) * 1000)
        return this.fetchTxHex(txId, retryCount + 1)
      }
    },
    showAddressHistoryDetails: function (addressHistory) {
      addressHistory.expanded = true
    },
    getAddressDetails: function (address) {
      LNbits.api
        .request(
          'GET',
          '/watchonly/api/v1/mempool/' + address,
          this.g.user.wallets[0].inkey
        )
        .then(function (response) {
          return reponse.data
        })
        .catch(function (error) {
          LNbits.utils.notifyApiError(error)
        })
    },
    refreshAddresses: async function () {
      const wallets = await this.getWatchOnlyWallets()
      this.addresses.data = []
      for (const {id, address_no} of wallets) {
        const addrs = await this.getAddressesForWallet(id)
        addrs.forEach(a => (a.expanded = false))
        this.addresses.data.push(...addrs)
      }
    },
    getAddressesForWallet: async function (walletId) {
      try {
        const {data} = await LNbits.api.request(
          'GET',
          '/watchonly/api/v1/addresses/' + walletId,
          this.g.user.wallets[0].inkey
        )
        return data
      } catch (err) {
        LNbits.utils.notifyApiError(err)
      }
    },
    updateAmountForAddress: async function (addressData, amount = 0) {
      try {
        const wallet = this.g.user.wallets[0] // todo: find active wallet
        addressData.amount = amount
        if (addressData.branch_index === 0) {
          const addressWallet = this.walletLinks.find(
            w => w.id === addressData.wallet
          )
          if (
            addressWallet &&
            addressWallet.address_no < addressData.address_index
          ) {
            addressWallet.address_no = addressData.address_index
          }
        }

        await LNbits.api.request(
          'PUT',
          `/watchonly/api/v1/address/${addressData.id}`,
          wallet.adminkey,
          {amount}
        )
      } catch (err) {
        LNbits.utils.notifyApiError(err)
      }
    },
    updateNoteForAddress: async function (addressData, note) {
      try {
        const wallet = this.g.user.wallets[0] // todo: find active wallet
        addressData.note = note
        await LNbits.api.request(
          'PUT',
          `/watchonly/api/v1/address/${addressData.id}`,
          wallet.adminkey,
          {note: addressData.note}
        )
      } catch (err) {
        LNbits.utils.notifyApiError(err)
      }
    },

    openGetFreshAddressDialog: async function (walletId) {
      const wallet = this.g.user.wallets[0] // todo: find active wallet
      const {data} = await LNbits.api.request(
        'GET',
        `/watchonly/api/v1/address/${walletId}`,
        this.g.user.wallets[0].inkey
      )
      // todo: refresh address list
      console.log('### data', data)
      this.openQrCodeDialog(data)
    },
    getMempool: function () {
      var self = this

      LNbits.api
        .request(
          'GET',
          '/watchonly/api/v1/mempool',
          this.g.user.wallets[0].adminkey
        )
        .then(function (response) {
          self.mempool.endpoint = response.data.endpoint
        })
        .catch(function (error) {
          LNbits.utils.notifyApiError(error)
        })
    },

    updateMempool: function () {
      var self = this
      var wallet = this.g.user.wallets[0]
      LNbits.api
        .request(
          'PUT',
          '/watchonly/api/v1/mempool',
          wallet.adminkey,
          self.mempool
        )
        .then(function (response) {
          self.mempool.endpoint = response.data.endpoint
          self.walletLinks.push(mapwalletLink(response.data))
        })
        .catch(function (error) {
          LNbits.utils.notifyApiError(error)
        })
    },
    addressHistoryFromTxs: function (addressData, txs) {
      const addressHistory = []
      txs.forEach(tx => {
        const sent = tx.vin
          .filter(
            vin => vin.prevout.scriptpubkey_address === addressData.address
          )
          .map(vin => mapInputToSentHistory(tx, addressData, vin))
        const received = tx.vout
          .filter(vout => vout.scriptpubkey_address === addressData.address)
          .map(vout => mapOutputToReceiveHistory(tx, addressData, vout))
        addressHistory.push(...sent, ...received)
      })
      return addressHistory
    },
    getAddressTxsDelayed: async function (addrData, retryCount = 0) {
      const {
        bitcoin: {addresses: addressesAPI}
      } = mempoolJS()
      try {
        await sleep(250)
        const addressTxs = await addressesAPI.getAddressTxs({
          address: addrData.address
        })
        return this.addressHistoryFromTxs(addrData, addressTxs)
      } catch (err) {
        if (retryCount > 10) throw err
        await sleep((retryCount + 1) * 1000)
        return this.getAddressTxsDelayed(addrData, retryCount + 1)
      }
    },
    getAddressTxsUtxoDelayed: async function (address, retryCount = 0) {
      const {
        bitcoin: {addresses: addressesAPI}
      } = mempoolJS()
      try {
        await sleep(250)
        return await addressesAPI.getAddressTxsUtxo({
          address
        })
      } catch (err) {
        if (retryCount > 10) throw err
        await sleep((retryCount + 1) * 1000)
        return this.getAddressTxsUtxoDelayed(address, retryCount + 1)
      }
    },
    updateUtxosForAddress: function (addressData, utxos = []) {
      const wallet =
        this.walletLinks.find(w => w.id === addressData.wallet) || {}

      const newUtxos = utxos.map(utxo =>
        mapToAddressUtxo(wallet, addressData, utxo)
      )
      this.utxos.data.push(...newUtxos)
      if (utxos.length) {
        this.utxos.data.sort((a, b) => b.sort - a.sort)
        this.utxos.total = this.utxos.data.reduce(
          (total, y) => (total += y?.amount || 0),
          0
        )
      }
      const addressTotal = utxos.reduce(
        (total, y) => (total += y?.value || 0),
        0
      )
      this.updateAmountForAddress(addressData, addressTotal)
    },
    scanAllAddressUTXOs: async function () {
      await this.refreshAddresses()
      this.addresses.history = []
      let addresses = this.addresses.data
      this.utxos.data = []
      // Loop while new funds are found on the gap adresses.
      // Use 1000 limit as a safety check (scan 20 000 addresses max)
      for (let i = 0; i < 1000 && addresses.length; i++) {
        await this.updateUtxosForAddresses(addresses)
        const oldAddresses = this.addresses.data.slice()
        await this.refreshAddresses()
        const newAddresses = this.addresses.data.slice()
        // check if gap addresses have been extended
        addresses = newAddresses.filter(
          newAddr => !oldAddresses.find(oldAddr => oldAddr.id === newAddr.id)
        )
        if (addresses.length) {
          this.$q.notify({
            type: 'positive',
            message: 'Funds found! Scanning for more...',
            timeout: 10000
          })
        }
      }
    },
    scanAddressWithAmountUTXOs: async function () {
      const addresses = this.addresses.data.filter(a => a.has_activity) // todo: remove duplicates
      this.utxos.data = []
      await this.updateUtxosForAddresses(addresses)
    },
    updateUtxosForAddresses: async function (addresses = []) {
      this.scan = {scanning: true, scanCount: addresses.length, scanIndex: 0}

      try {
        for (addrData of addresses) {
          const addressHistory = await this.getAddressTxsDelayed(addrData)
          this.addresses.history.push(...addressHistory)
          if (addressHistory.length) {
            // only if it ever had any activity
            const utxos = await this.getAddressTxsUtxoDelayed(addrData.address)
            this.updateUtxosForAddress(addrData, utxos)
          }

          this.scan.scanIndex++
        }
      } catch (err) {
        console.error(err) // todo: show UI error
      } finally {
        this.scan.scanning = false
      }
    },

    getWatchOnlyWallets: async function () {
      const {data} = await LNbits.api.request(
        'GET',
        '/watchonly/api/v1/wallet',
        this.g.user.wallets[0].inkey
      )
      return data
    },
    refreshWalletLinks: async function () {
      try {
        const wallets = await this.getWatchOnlyWallets()
        this.walletLinks = wallets.map(w => mapWalletLink(w))
      } catch (err) {
        LNbits.utils.notifyApiError(err)
      }
    },

    closeFormDialog: function () {
      this.formDialog.data = {
        is_unique: false
      }
    },
    openQrCodeDialog: function (address) {
      this.currentAddress = address
      this.addresses.note = address.note || ''
      this.addresses.show = true
    },
    sendFormData: function () {
      var wallet = this.g.user.wallets[0]
      var data = _.omit(this.formDialog.data, 'wallet')
      this.createWalletLink(wallet, data)
    },
    createWalletLink: async function (wallet, data) {
      try {
        const response = await LNbits.api.request(
          'POST',
          '/watchonly/api/v1/wallet',
          wallet.adminkey,
          data
        )
        this.walletLinks.push(mapWalletLink(response.data))
        this.formDialog.show = false
        await this.refreshWalletLinks()
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      }
    },
    deleteWalletLink: function (linkId) {
      var self = this
      var link = _.findWhere(this.walletLinks, {id: linkId})
      LNbits.utils
        .confirmDialog(
          'Are you sure you want to delete this watch only wallet?'
        )
        .onOk(async () => {
          try {
            await LNbits.api.request(
              'DELETE',
              '/watchonly/api/v1/wallet/' + linkId,
              this.g.user.wallets[0].adminkey
            )
            this.walletLinks = _.reject(this.walletLinks, function (obj) {
              return obj.id === linkId
            })
            await this.refreshWalletLinks()
            await this.refreshAddresses()
            await this.scanAddressWithAmountUTXOs()
          } catch (err) {
            LNbits.utils.notifyApiError(error)
          }
        })
    },
    exportCSV: function () {
      LNbits.utils.exportCSV(this.paywallsTable.columns, this.paywalls)
    },
    satBtc(val) {
      return this.utxos.sats
        ? LNbits.utils.formatSat(val)
        : val == 0
        ? 0.0
        : (val / 100000000).toFixed(8)
    }
  },
  created: async function () {
    if (this.g.user.wallets.length) {
      this.getMempool()
      await this.refreshWalletLinks()
      await this.refreshAddresses()
      await this.scanAddressWithAmountUTXOs()
    }
  }
})
