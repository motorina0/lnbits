function watchonlyApiJS(op = {}) {
  function toFullUrl(url = '') {
    if (!op.hostname) return url
    if (op.hostname === 'localhost') return `http://${op.hostname}${url}`
    return `https://${op.hostname}${url}`
  }
  return {
    request: function (method, url, apiKey, data) {
      return axios({
        method: method,
        url: toFullUrl(url),
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
