function lnbitsApiJS(op = {}) {
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
    createInvoice: async function (
      wallet,
      amount,
      memo,
      unit = 'sat',
      lnurlCallback = null
    ) {
      return this.request('post', '/api/v1/payments', wallet.inkey, {
        out: false,
        amount: amount,
        memo: memo,
        unit: unit,
        lnurl_callback: lnurlCallback
      })
    },
    payInvoice: function (wallet, bolt11) {
      return this.request('post', '/api/v1/payments', wallet.adminkey, {
        out: true,
        bolt11: bolt11
      })
    },
    payLnurl: function (
      wallet,
      callback,
      description_hash,
      amount,
      description = '',
      comment = ''
    ) {
      return this.request('post', '/api/v1/payments/lnurl', wallet.adminkey, {
        callback,
        description_hash,
        amount,
        comment,
        description
      })
    },
    authLnurl: function (wallet, callback) {
      return this.request('post', '/api/v1/lnurlauth', wallet.adminkey, {
        callback
      })
    },
    getWallet: function (wallet) {
      return this.request('get', '/api/v1/wallet', wallet.inkey)
    },
    getPayments: function (wallet) {
      return this.request('get', '/api/v1/payments', wallet.inkey)
    },
    getPayment: function (wallet, paymentHash) {
      return this.request(
        'get',
        '/api/v1/payments/' + paymentHash,
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
