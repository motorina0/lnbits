function loadTemplateAsync(path) {
  const result = new Promise(resolve => {
    const xhttp = new XMLHttpRequest()

    xhttp.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) resolve(this.responseText)

        if (this.status == 404) resolve(`<div>Page not found: ${path}</div>`)
      }
    }

    xhttp.open('GET', path, true)
    xhttp.send()
  })

  return result
}

const mapExternalExtension = ext => ({
  id: ext.id,
  name: ext.name,
  publicId: ext.public_id,
  active: ext.active,
  time: ext.time,
  manifestJson: ext.manifest,
  manifest: ext.manifest ? JSON.parse(ext.manifest) : '',
  expanded: false
})
