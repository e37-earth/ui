const application = (E37) => {
    const { UI } = E37
    return new UI.transformer(async (input, envelope) => {
        const XDR = await UI.resolveUnit('xdr', 'library'), { state } = envelope, { response = {} } = state
        let xTypeHeader = state.type ?? response?.headers?.['x-type'], typeDef
        if (xTypeHeader) {
            const { url, headers = {} } = response
            let options = { baseURI: 'baseuri', name: 'name', namespace: 'namespace', includes: 'includes' }
            for (const k in options) options[k] = state[k] ?? headers[`x-options-${k}`]
            let entry = state.entry ?? headers['x-entry'] ?? UI.resolveUrl(url, undefined, true).pathname.split('/').pop().replace('.x', '').trim()
            typeDef = await XDR.factory(UI.resolveUrl(xTypeHeader, url), entry, options)
        }
        return XDR.parse(input, typeDef)
    })
}
const text = (E37) => {
    const { UI } = E37
    return new UI.transformer(async (input, envelope) => {
        if (typeof input !== 'string') return
        const XDR = await UI.resolveUnit('xdr', 'library'), { state } = envelope, { response = {} } = state, { headers = {} } = response
        let options = { baseURI: 'baseuri', name: 'name', namespace: 'namespace', includes: 'includes' }
        for (const k in options) options[k] = state[k] ?? headers[`x-options-${k}`]
        let entry = state.entry ?? headers['x-entry']
        if (response.url && (!entry || !options.baseURI || !options.name)) {
            const { url } = response, { pathname, href } = UI.resolveUrl(url, undefined, true), filename = pathname.split('/').pop().replace('.x', '').trim()
            options.baseURI ??= href
            entry ??= filename
            options.name ??= filename
        }
        if (options.includes) options.includes = await UI.resolveUnit(options.includes, 'library')
        return XDR.factory(input, entry, options)
    })
}
export { application, text }
