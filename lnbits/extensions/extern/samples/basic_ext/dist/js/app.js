const lnbitsApi = lnbitsApiJS()
const watchonlyApi = watchonlyApiJS()

async function init() {
    await refreshPayments()
    await refreshAccounts()
}

async function generateInvoice() {
    const invoiceMessage = document.getElementById('invoiceMessage')
    const adminkey = localStorage.getItem("adminkey")
    const amountInput = document.getElementById('amountInput')
    const memoInput = document.getElementById('memoInput')

    if (!adminkey) {
        invoiceMessage.innerText = 'Admin Key Required'
        return
    }
    const wallet = { inkey: adminkey }
    try {
        const invoiceResp = await lnbitsApi.createInvoice(wallet, amountInput.value, memoInput.value || 'basic ext')
        invoiceMessage.innerText = invoiceResp.data.payment_request
        await refreshPayments()
    } catch (error) {
        invoiceMessage.innerText = JSON.stringify(error)
    }
}

async function refreshPayments() {
    const wallet = { inkey: localStorage.getItem("inkey") }
    try {
        const paymentsResp = await lnbitsApi.getPayments(wallet)
        console.log('### paymentsResp', paymentsResp)
        printPayments(paymentsResp.data)
    } catch (error) {
        console.error(error)
    }
}

function printPayments(payments) {
    const view = document.getElementById("payments")
    view.innerHTML = `<hr><h3>Nunber of Payments: ${payments.length}</h3>`
    const paymentList = payments.map(p => `<li> ${p.memo}: ${p.amount} </li>`).join('')
    view.innerHTML += `<ul>${paymentList}</ul>`
}


async function refreshAccounts() {
    const wallet = { inkey: localStorage.getItem("inkey") }
    try {
        // watchonlyApi.hostname = hostKey.hostname // todo: github.io
        const accoutsResp = await watchonlyApi.getAccounts(wallet)
        printAccounts(accoutsResp.data)
    } catch (error) {
        console.error(error)
    }
}

function printAccounts(accounts) {
    const view = document.getElementById("accounts")
    view.innerHTML = `<hr><h3>Number of Onchain Accounts: ${accounts.length}</h3>`
    const accountList = accounts.map(a => `<li> ${a.title} (${a.type}). Used addresses: ${a.address_no + 1} </li>`)
    view.innerHTML += `<ul>${accountList}</ul>`
}