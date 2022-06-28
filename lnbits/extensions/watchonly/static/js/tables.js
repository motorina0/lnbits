const tables = {
  walletsTable: {
    columns: [
      {
        name: 'new',
        align: 'left',
        label: ''
      },
      {
        name: 'title',
        align: 'left',
        label: 'Title',
        field: 'title'
      },
      {
        name: 'amount',
        align: 'left',
        label: 'Amount'
      },
      {
        name: 'type',
        align: 'left',
        label: 'Type',
        field: 'type'
      },
      {name: 'id', align: 'left', label: 'ID', field: 'id'}
    ],
    pagination: {
      rowsPerPage: 10
    },
    filter: ''
  },
  utxosTable: {
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
    filter: ''
  },
  paymentTable: {
    columns: [
      {
        name: 'data',
        align: 'left'
      }
    ],
    pagination: {
      rowsPerPage: 10
    },
    filter: ''
  },
  addressesTable: {
    columns: [
      {
        name: 'expand',
        align: 'left',
        label: ''
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
    filter: ''
  },
  historyTable: {
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
    filter: ''
  }
}

const tableData = {
  walletAccounts: [],
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
    recommededFees: {
      fastestFee: 1,
      halfHourFee: 1,
      hourFee: 1,
      economyFee: 1,
      minimumFee: 1
    },
    fee: 0,
    txSize: 0,
    psbtBase64: '',
    utxoSelectionModes: [
      'Manual',
      'Random',
      'Select All',
      'Smaller Inputs First',
      'Larger Inputs First'
    ],
    utxoSelectionMode: 'Manual',
    show: false,
    showAdvanced: false
  }
}
