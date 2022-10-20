console.log('### WatchOnly')
window.LNbits.watchonly = {
  api: {
    getAccounts: function (wallet, network = 'Mainnet') {
      return window.LNbits.api.request(
        'get',
        `/watchonly/api/v1/wallet?network=${network}`,
        wallet.inkey
      )
    }
  }
}
