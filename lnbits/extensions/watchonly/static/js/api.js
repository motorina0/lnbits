function watchonlyApiJS(op = {}) {
  return {
    hostname: op.hostname,
    request: function (method, url, apiKey, data) {
      return axios({
        method: method,
        url: toFullUrl(this.hostname, url),
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

  function toFullUrl(hostname = '', url = '') {
    if (!hostname) return url
    if (hostname.startsWith('localhost:')) return `http://${hostname}${url}`
    return `https://${hostname}${url}`
  }
}
