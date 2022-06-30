Vue.component(VueQrcode.name, VueQrcode)

Vue.filter('reverse', function (value) {
  // slice to make a copy of array, then reverse the copy
  return value.slice().reverse()
})

new Vue({
  el: '#vue',
  mixins: [windowMixin],
  data: function () {
    return {
      DUST_LIMIT: 546,
      filter: '',
      balance: null,
      scan: {
        scanning: false,
        scanCount: 0,
        scanIndex: 0
      },

      currentAddress: null,

      tab: 'addresses',

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
      ...tables,
      ...tableData
    }
  },

  methods: {
    //################### MEMPOOL ###################
    getMempool: async function () {
      try {
        const {data} = await LNbits.api.request(
          'GET',
          '/watchonly/api/v1/mempool',
          this.g.user.wallets[0].adminkey
        )
        this.mempool.endpoint = data.endpoint
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      }
    },
    updateMempool: async function () {
      const wallet = this.g.user.wallets[0]
      try {
        const {data} = await LNbits.api.request(
          'PUT',
          '/watchonly/api/v1/mempool',
          wallet.adminkey,
          this.mempool
        )

        this.mempool.endpoint = data.endpoint
        this.walletAccounts.push(mapWalletAccount(data))
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      }
    },

    //################### WALLETS ###################
    getWalletName: function (walletId) {
      const wallet = this.walletAccounts.find(wl => wl.id === walletId)
      return wallet ? wallet.title : 'unknown'
    },
    addWalletAccount: function () {
      const wallet = this.g.user.wallets[0]
      const data = _.omit(this.formDialog.data, 'wallet')
      this.createWalletAccount(wallet, data)
    },
    createWalletAccount: async function (wallet, data) {
      try {
        const response = await LNbits.api.request(
          'POST',
          '/watchonly/api/v1/wallet',
          wallet.adminkey,
          data
        )
        this.walletAccounts.push(mapWalletAccount(response.data))
        this.formDialog.show = false
        await this.refreshWalletAccounts()
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      }
    },
    deleteWalletAccount: function (linkId) {
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
            this.walletAccounts = _.reject(this.walletAccounts, function (obj) {
              return obj.id === linkId
            })
            await this.refreshWalletAccounts()
            await this.refreshAddresses()
            await this.scanAddressWithAmountUTXOs()
          } catch (error) {
            LNbits.utils.notifyApiError(error)
          }
        })
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
    getWatchOnlyWallets: async function () {
      const {data} = await LNbits.api.request(
        'GET',
        '/watchonly/api/v1/wallet',
        this.g.user.wallets[0].inkey
      )
      return data
    },
    refreshWalletAccounts: async function () {
      try {
        const wallets = await this.getWatchOnlyWallets()
        this.walletAccounts = wallets.map(w => mapWalletAccount(w))
      } catch (err) {
        LNbits.utils.notifyApiError(err)
      }
    },
    getAmmountForWallet: function (walletId) {
      const amount = this.addresses.data
        .filter(a => a.wallet === walletId)
        .reduce((t, a) => t + a.amount || 0, 0)
      return this.satBtc(amount)
    },

    //################### ADDRESSES ###################
    getAddressDetails: async function (address) {
      try {
        const {data} = await LNbits.api.request(
          'GET',
          '/watchonly/api/v1/mempool/' + address,
          this.g.user.wallets[0].inkey
        )
        return data
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      }
    },
    refreshAddresses: async function () {
      const wallets = await this.getWatchOnlyWallets()
      this.addresses.data = []
      for (const {id, type} of wallets) {
        const addrs = await this.getAddressesForWallet(id)
        addrs.forEach(a => {
          a.expanded = false
          a.accountType = type // todo: is this needed?
        })
        this.addresses.data.push(...addrs)
      }
    },
    updateAmountForAddress: async function (addressData, amount = 0) {
      try {
        const wallet = this.g.user.wallets[0] // todo: find active wallet
        addressData.amount = amount
        if (addressData.branch_index === 0) {
          const addressWallet = this.walletAccounts.find(
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
    getFilteredAddresses: function () {
      const selectedWalletId = this.addresses.selectedWallet?.id
      const filter = this.addresses.filterValues || []
      const includeChangeAddrs = filter.includes('Show Change Addresses')
      const includeGapAddrs = filter.includes('Show Gap Addresses')
      const excludeNoAmount = filter.includes('Only With Amount')

      const walletsLimit = this.walletAccounts.reduce((r, w) => {
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
    openGetFreshAddressDialog: async function (walletId) {
      const {data: addressData} = await LNbits.api.request(
        'GET',
        `/watchonly/api/v1/address/${walletId}`,
        this.g.user.wallets[0].inkey
      )
      this.openQrCodeDialog(addressData)
      const wallet = this.walletAccounts.find(w => w.id === walletId) || {}
      wallet.address_no = addressData.address_index
      await this.refreshAddresses()
    },

    //################### ADDRESS HISTORY ###################
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
    getFilteredAddressesHistory: function () {
      return this.addresses.history
        .filter(a => !a.isChange)
        .sort((a, b) => (!a.height ? -1 : b.height - a.height))
    },
    showAddressHistoryDetails: function (addressHistory) {
      addressHistory.expanded = true
    },

    //################### PAYMENT ###################
    createTx: function () {
      const tx = {
        fee_rate: this.payment.feeRate,
        tx_size: this.payment.txSize,
        masterpubs: this.walletAccounts.map(w => ({
          public_key: w.masterpub,
          fingerprint: w.fingerprint
        }))
      }
      tx.inputs = this.utxos.data
        .filter(utxo => utxo.selected)
        .map(mapUtxoToPsbtInput)
        .sort((a, b) =>
          a.tx_id < b.tx_id ? -1 : a.tx_id > b.tx_id ? 1 : a.vout - b.vout
        )

      tx.outputs = this.payment.data.map(out => ({
        address: out.address,
        amount: out.amount
      }))

      const change = this.createChangeOutput()
      this.payment.changeAmount = change.amount
      if (change.amount >= this.DUST_LIMIT) {
        tx.outputs.push(change)
      }

      // Only sort by amount on UI level (no lib for address decode)
      // Should sort by scriptPubKey (as byte array) on the backend
      tx.outputs.sort((a, b) => a.amount - b.amount)

      return tx
    },
    createChangeOutput: function () {
      const change = this.payment.changeAddress
      const fee = this.payment.feeRate * this.payment.txSize
      const inputAmount = this.getTotalSelectedUtxoAmount()
      const payedAmount = this.getTotalPaymentAmount()
      const walletAcount =
        this.walletAccounts.find(w => w.id === change.wallet) || {}
      return {
        address: change.address,
        amount: inputAmount - payedAmount - fee,
        branch_index: change.branch_index,
        address_index: change.address_index,
        master_fingerprint: walletAcount.fingerprint
      }
    },
    computeFee: function () {
      const tx = this.createTx()
      this.payment.txSize = Math.round(txSize(tx))
      return this.payment.feeRate * this.payment.txSize
    },
    createPsbt: async function () {
      const wallet = this.g.user.wallets[0] // todo: find active wallet
      try {
        this.computeFee()
        const tx = this.createTx()
        txSize(tx)
        for (const input of tx.inputs) {
          input.tx_hex = await this.fetchTxHex(input.tx_id)
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
    deletePaymentAddress: function (v) {
      const index = this.payment.data.indexOf(v)
      if (index !== -1) {
        this.payment.data.splice(index, 1)
      }
    },
    initPaymentData: async function () {
      if (!this.payment.show) return
      await this.refreshAddresses()

      this.payment.showAdvanced = false
      this.payment.changeWallet = this.walletAccounts[0]
      this.selectChangeAccount(this.payment.changeWallet)

      await this.refreshRecommendedFees()
      this.payment.feeRate = this.payment.recommededFees.halfHourFee
    },
    getFeeRateLabel: function (feeRate) {
      const fees = this.payment.recommededFees
      if (feeRate >= fees.fastestFee) return `High Priority (${feeRate} sat/vB)`
      if (feeRate >= fees.halfHourFee)
        return `Medium Priority (${feeRate} sat/vB)`
      if (feeRate >= fees.hourFee) return `Low Priority (${feeRate} sat/vB)`
      return `No Priority (${feeRate} sat/vB)`
    },
    addPaymentAddress: function () {
      this.payment.data.push({address: '', amount: undefined})
    },
    getTotalPaymentAmount: function () {
      return this.payment.data.reduce((t, a) => t + (a.amount || 0), 0)
    },
    selectChangeAccount: function (wallet) {
      this.payment.changeAddress =
        this.addresses.data.find(
          a => a.wallet === wallet.id && a.branch_index === 1 && !a.has_activity
        ) || {}
    },
    goToPaymentView: async function () {
      this.payment.show = true
      this.tab = 'utxos'
      await this.initPaymentData()
    },

    //################### UTXOs ###################
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
      } catch (error) {
        console.log('### error', error)
        // LNbits.utils.notifyApiError(error)
      } finally {
        this.scan.scanning = false
      }
    },
    updateUtxosForAddress: function (addressData, utxos = []) {
      const wallet =
        this.walletAccounts.find(w => w.id === addressData.wallet) || {}

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
    getTotalSelectedUtxoAmount: function () {
      const total = this.utxos.data
        .filter(u => u.selected)
        .reduce((t, a) => t + (a.amount || 0), 0)
      return total
    },
    applyUtxoSelectionMode: function () {
      const payedAmount = this.getTotalPaymentAmount()
      const mode = this.payment.utxoSelectionMode
      this.utxos.data.forEach(u => (u.selected = false))
      const isManual = mode === 'Manual'
      if (isManual || !payedAmount) return

      const isSelectAll = mode === 'Select All'
      if (isSelectAll || payedAmount >= this.utxos.total) {
        this.utxos.data.forEach(u => (u.selected = true))
        return
      }
      const isSmallerFirst = mode === 'Smaller Inputs First'
      const isLargerFirst = mode === 'Larger Inputs First'

      let selectedUtxos = this.utxos.data.slice()
      if (isSmallerFirst || isLargerFirst) {
        const sortFn = isSmallerFirst
          ? (a, b) => a.amount - b.amount
          : (a, b) => b.amount - a.amount
        selectedUtxos.sort(sortFn)
      } else {
        // default to random order
        selectedUtxos = _.shuffle(selectedUtxos)
      }
      selectedUtxos.reduce((total, utxo) => {
        utxo.selected = total < payedAmount
        total += utxo.amount
        return total
      }, 0)
    },

    //################### MEMPOOL API ###################
    getAddressTxsDelayed: async function (addrData) {
      const {
        bitcoin: {addresses: addressesAPI}
      } = mempoolJS()

      const fn = async () =>
        addressesAPI.getAddressTxs({
          address: addrData.address
        })
      const addressTxs = await retryWithDelay(fn)
      return this.addressHistoryFromTxs(addrData, addressTxs)
    },

    refreshRecommendedFees: async function () {
      const {
        bitcoin: {fees: feesAPI}
      } = mempoolJS()

      const fn = async () => feesAPI.getFeesRecommended()
      this.payment.recommededFees = await retryWithDelay(fn)
    },
    getAddressTxsUtxoDelayed: async function (address) {
      const {
        bitcoin: {addresses: addressesAPI}
      } = mempoolJS()

      const fn = async () =>
        addressesAPI.getAddressTxsUtxo({
          address
        })
      return retryWithDelay(fn)
    },
    fetchTxHex: async function (txId) {
      const {
        bitcoin: {transactions: transactionsAPI}
      } = mempoolJS()

      const fn = async () => transactionsAPI.getTxHex({txid: txId})
      return retryWithDelay(fn)
    },

    //################### OTHER ###################
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
    searchInTab: function (tab, value) {
      this.tab = tab
      this[`${tab}Table`].filter = value
    },
    exportCSV: function () {
      LNbits.utils.exportCSV(this.paywallsTable.columns, this.paywalls) // todo: paywallsTable??
    },
    satBtc(val) {
      return this.utxos.sats
        ? LNbits.utils.formatSat(val)
        : val == 0
        ? 0.0
        : (val / 100000000).toFixed(8)
    },
    getAccountDescription: function (accountType) {
      return getAccountDescription(accountType)
    }
  },
  created: async function () {
    if (this.g.user.wallets.length) {
      this.getMempool()
      await this.refreshWalletAccounts()
      await this.refreshAddresses()
      await this.scanAddressWithAmountUTXOs()
    }
  }
})
