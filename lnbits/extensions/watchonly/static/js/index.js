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
      for (const {id} of wallets) {
        const addrs = await this.getAddressesForWallet(id)
        addrs.forEach(a => (a.expanded = false))
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
    createPsbt: async function () {
      const wallet = this.g.user.wallets[0] // todo: find active wallet
      try {
        const tx = {
          fee_rate: this.payment.feeRate,
          masterpubs: this.walletAccounts.map(w => w.masterpub)
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
    showAddressHistoryDetails: function (addressHistory) {
      addressHistory.expanded = true
    },

    //################### PAYMENT ###################
    deletePaymentAddress: function (v) {
      const index = this.payment.data.indexOf(v)
      if (index !== -1) {
        this.payment.data.splice(index, 1)
      }
    },
    initPaymentData: function () {
      if (!this.payment.show) return

      this.payment.changeWallet = this.walletAccounts[0]
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
        LNbits.utils.notifyApiError(error)
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
    getTotalUtxoAmount: function () {
      const total = this.utxos.data.reduce((t, a) => t + (a.amount || 0), 0)
      return this.satBtc(total)
    },

    //################### MEMPOOL API ###################
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
