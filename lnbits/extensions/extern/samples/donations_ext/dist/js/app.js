const lnbitsApi = lnbitsApiJS()
const watchonlyApi = watchonlyApiJS()
const externApi = externApiJS()


async function createDonation() {
    const name = document.getElementById('donationName').value
    const description = document.getElementById('donationDescription').value
    const accountId = document.getElementById('accounts').value
    console.log('### createDonation', name, description, accountId)

    try {
        let wallet = { inkey: localStorage.getItem("inkey") }
        const extensionId = localStorage.getItem("extensionId")
        console.log('### extensionId', extensionId)
        const addressData = await watchonlyApi.getNewAddress(wallet, accountId)

        const publicData = {
            address: addressData.data.address,
            name,
            description,
        }

        wallet = { adminkey: localStorage.getItem("adminkey") }
        await externApi.createResource(wallet, extensionId, addressData.data, publicData)
        await fetchDonations()
    } catch (error) {
        console.error(error)
        // todo show error
    }
}

async function fetchAccounts() {
    const wallet = { inkey: localStorage.getItem("inkey") }
    try {
        const accoutsResp = await watchonlyApi.getAccounts(wallet)
        console.log('### accoutsResp', accoutsResp)

        const accountElement = document.getElementById('accounts')
        accoutsResp.data.forEach(account => {
            const option = document.createElement("option");
            option.text = account.title;
            option.value = account.id
            accountElement.add(option);
        })

    } catch (error) {
        console.error(error)
    }
}

async function fetchDonations() {
    const wallet = { inkey: localStorage.getItem("inkey") }
    const extensionId = localStorage.getItem("extensionId")
    try {
        const resources = await externApi.getResources(wallet, extensionId)
        const tableRef = document.getElementById('resourcesTable').getElementsByTagName('tbody')[0];
        tableRef.innerHTML = ''
        resources.data.forEach(r => {
            const newRow = tableRef.insertRow(tableRef.rows.length);
            newRow.innerHTML = `<tr>
                <td>${r.public_data.name}</td>
                <td>${r.public_data.description}</td>
                <td><a href="/extern/public/${extensionId}?id=${r.id}" target="_blank">${r.data.address}</a></td>
                <td><button type="button" onclick="deleteResource('${r.id}')" class="btn btn-danger">x</button></td>
             </tr>`
        })


    } catch (error) {
        console.error(error)
    }
}

async function showQrCode() {
    const publicData = JSON.parse(localStorage.getItem("publicData"))
    document.getElementById('publicDonationHeader').innerHTML = `<h4>${publicData.name} (${publicData.description})</h4>`
    document.getElementById('publicDonationFooter').innerHTML = `<h4>Address: ${publicData.address}</h4>`
    new QRCode(document.getElementById('qrcode'), {
        text: publicData.address,
        width: 256,
        height: 256,
        colorDark: '#000',
        colorLight: '#fff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

async function deleteResource(resourceId) {
    const wallet = { adminkey: localStorage.getItem("adminkey") }
    await externApi.deleteResource(wallet, resourceId)
    await fetchDonations()
}