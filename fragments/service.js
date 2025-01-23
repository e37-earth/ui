export default {
    run: async function (value, action, envelope) {
        const { E37 } = this, { UI } = E37
        if (this.preProcessor) value = await UI.runUnit(this.preProcessor, 'transformer', value)
        action = (action ? this.actions[action] : undefined) ?? { pathname: `/${('pathname' in this.options) ? (this.options.pathname || '') : (action || '')}` }
        const options = {
            ...this.options, ...(action?.options ?? {}),
            method: action.method ?? ({ null: 'HEAD', false: 'DELETE', true: 'GET', undefined: 'GET' })[value] ?? this.options.method,
            headers: { ...this.options.headers, ...(action?.options?.headers ?? {}) }
        }, merge = true, pathname = UI.resolveVariable(action.pathname, envelope, { merge }),
            url = UI.resolveUrl(pathname, UI.resolveVariable(this.base, envelope, { merge }))
        if (value === 0 || (value && typeof value !== 'string')) {
            const contentType = options.headers['Content-Type'] ?? options.headers['content-type'] ?? action.contentType ?? this.contentType
            options.body = await UI.runUnit(contentType, 'transformer', value)
            if (typeof options.body !== 'string') throw new Error(`Input value unable to be serialized to "${contentType}".`)
        }
        const response = await fetch(url, options)
        let result
        if (response.ok) {
            const acceptType = options.headers.Accept ?? options.headers.accept ?? action.acceptType ?? this.acceptType
            result = await UI.runUnit(acceptType, 'transformer', await response.text())
            if (this.postProcessor) result = await UI.runUnit(this.postProcessor, 'transformer', result)
        } else if (this.errorProcessor) result = await UI.runUnit(this.errorProcessor, 'transformer', response)
        return result
    }
}