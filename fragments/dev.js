export default async function (globalNamespaceKey) {
    if (globalNamespaceKey && !/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(globalNamespaceKey)) throw new Error(`Invalid global namespace key: "${globalNamespaceKey}". Must be a valid JavaScript identifier.`)
    const { isPlainObject, modules } = this
    return this.installModule('dev').then(dev => {
        for (const [p, v = dev[p]] of Object.getOwnPropertyNames(dev)) if (isPlainObject.call(this, v)) for (const [pp, vv = v[pp]] in v) if (typeof vv === 'function') v[pp] = vv.bind(this)
    }).then(() => {
        const globalLibraryScope = globalNamespaceKey ? (window[globalNamespaceKey] ??= {}) : window
        globalLibraryScope.E37 ??= {}
        globalLibraryScope.E37.UI = this
        modules.dev.console.welcome(globalNamespaceKey)
    })
}
