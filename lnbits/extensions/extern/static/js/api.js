function externApiJS(op = {}) {
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

    createResource: async function (wallet, extId, data, publicData) {
      return this.request('post', '/extern/api/v1/resource', wallet.adminkey, {
        ext_id: extId,
        data: data,
        public_data: publicData
      })
    },
    getResources: function (wallet, extensionId) {
      return this.request(
        'get',
        `/extern/api/v1/resources/${extensionId}`,
        wallet.inkey
      )
    },
    deleteResource: function (wallet, resourceId) {
      return this.request(
        'delete',
        `/extern/api/v1/resource/${resourceId}`,
        wallet.adminkey
      )
    }
  }

  function toFullUrl(hostname = '', url = '') {
    if (!hostname) return url
    if (hostname.startsWith('localhost:')) return `http://${hostname}${url}`
    return `https://${hostname}${url}`
  }
}
