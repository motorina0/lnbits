async function extensionList(path) {
  const template = await loadTemplateAsync(path)
  Vue.component('extension-list', {
    name: 'extension-list',
    template,

    props: ['adminkey', 'inkey'],
    data: function () {
      return {
        extensions: [],
        model: null,
        uploadPath: '',
        extensionFileName: '',
        selectedExtension: {},
        showToggleExtension: false,

        formDialog: {
          show: false,

          data: {
            name: '',
            publicId: ''
          }
        },
        filter: '',
        showCreating: false,

        extensionsTable: {
          columns: [
            {
              name: 'status',
              align: 'left'
            },
            {
              name: 'name',
              align: 'left',
              label: 'Name',
              field: 'name'
            },
            {
              name: 'permissions',
              align: 'left',
              label: 'Permissions'
            },
            {
              name: 'publicId',
              align: 'left',
              label: 'Path',
              field: 'publicId'
            }
          ],
          pagination: {
            rowsPerPage: 10
          },
          filter: ''
        }
      }
    },

    methods: {
      addExtension: async function () {
        this.showCreating = true

        await this.createExtension(this.formDialog.data)
        this.showCreating = false
      },
      createExtension: async function (data) {
        try {
          const meta = {permisions: []}

          const payload = {
            manifest: JSON.stringify(meta)
          }
          payload.name = data.name
          payload.public_id = data.publicId
          const response = await LNbits.api.request(
            'POST',
            '/extern/api/v1/extension',
            this.adminkey,
            payload
          )
          this.extensions.push(mapExternalExtension(response.data))
          this.formDialog.show = false
        } catch (error) {
          LNbits.utils.notifyApiError(error)
        }
      },

      deleteExtension: function (extId) {
        LNbits.utils
          .confirmDialog('Are you sure you want to delete this extension?')
          .onOk(async () => {
            try {
              await LNbits.api.request(
                'DELETE',
                '/extern/api/v1/extension/' + extId,
                this.adminkey
              )
              this.extensions = _.reject(this.extensions, function (obj) {
                return obj.id === extId
              })
            } catch (error) {
              this.$q.notify({
                type: 'warning',
                message: 'Error while deleting extension. Please try again.',
                timeout: 10000
              })
            }
          })
      },

      getExtensions: async function () {
        try {
          const {data} = await LNbits.api.request(
            'GET',
            '/extern/api/v1/extension',
            this.inkey
          )
          return data.map(mapExternalExtension)
        } catch (error) {
          this.$q.notify({
            type: 'warning',
            message: 'Failed to fetch extensions.',
            timeout: 10000
          })
          LNbits.utils.notifyApiError(error)
        }
        return []
      },

      closeFormDialog: function () {
        this.formDialog.data = {
          is_unique: false
        }
      },

      showFileSelectDialog: function () {
        this.$refs.extFileSelect.click()
        this.extensionFileName = ''
      
      },

      refreshExtensionsDelayed: function() {
        setTimeout(async () => {
          this.extensions = await this.getExtensions()
          this.extensionFileName = ''
        }, 1000)
      },

      showToggleExtensionDialog: function (extension) {
        if (extension.active) {
          this.toggleExtension(extension)
        } else {
          this.selectedExtension = extension
          this.showToggleExtension = true
        }
      },

      toggleExtension: async function (extension) {
        try {
          const payload = {
            active: !extension.active
          }
          const response = await LNbits.api.request(
            'PUT',
            `/extern/api/v1/extension/${extension.id}`,
            this.adminkey,
            payload
          )
          const index = this.extensions.findIndex(e => e.id === extension.id)
          if (index !== -1) {
            const updatedExtension = mapExternalExtension(response.data)
            updatedExtension.expanded = extension.expanded
            this.extensions.splice(index, 1, updatedExtension)
          }
          // refresh extension list
          window.location.reload()
        } catch (error) {
          LNbits.utils.notifyApiError(error)
        }
      }
    },
    created: async function () {
      if (this.inkey) {
        this.extensions = await this.getExtensions()
      }
      this.uploadPath = `/extern/api/v1/extension/?api-key=${this.adminkey}`

      this.$refs.extFileSelect.onchange = v => {
        const path = this.$refs.extFileSelect.value
        if (!path) return
        const pathElements = path
          .split('/')
          .map(p => p.split('\\'))
          .flat()
        this.extensionFileName = pathElements[pathElements.length - 1]
      }
    }
  })
}
