function watchonlyApiJS(op) {
  return {
    request: function (method, url, apiKey, data) {
      return axios({
        method: method,
        url: url,
        headers: {
          'X-Api-Key': apiKey
        },
        data: data
      })
    },
    getAccounts: function (wallet, network = 'Mainnet') {
      return this.request(
        'get',
        `/watchonly/api/v1/wallet?network=${network}`,
        wallet.inkey
      )
    }
  }
}
