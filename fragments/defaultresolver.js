const autoResolverSuffixes = Object.freeze({
        ai: ['js', 'json'],
        collection: ['js', 'json'],
        content: ['md', 'html', 'txt', 'js'],
        context: ['json', 'js'],
        facet: ['directives', 'js'],
        gateway: ['js'],
        hook: ['js'],
        interpreter: ['js'],
        library: ['js'],
        model: ['json', 'jsonl', 'js'],
        language: ['json', 'js'],
        pattern: ['txt', 'js'],
        renderer: ['js'],
        resolver: ['js'],
        service: ['js', 'json'],
        snippet: ['html', 'js'],
        transformer: ['js'],
        type: ['js', 'schema.json', 'json', 'x', 'xdr'],
    }),
    autoIndexes = Object.freeze({
        ai: 'main',
        collection: 'index',
        content: 'index',
        context: 'default',
        facet: 'main',
        gateway: 'main',
        hook: 'main',
        interpreter: 'main',
        library: 'index',
        model: 'main',
        language: 'index',
        pattern: 'main',
        renderer: 'main',
        resolver: 'main',
        service: 'main',
        snippet: 'index',
        transformer: 'main',
        type: 'main',
    })

export default async function (unitSource, unitType, initParams = {}) {
    if (!(unitSource && unitType)) return
    const unitTypeCollectionName = this.sys.unitTypeMap[unitType]?.[0]
    if (!unitTypeCollectionName) return
    let unitUrl, suffixIsExplicit
    if (unitSource.endsWith('/')) unitSource = `${unitSource}${autoIndexes[unitType]}`
    switch (unitSource[0]) {
        case '.':
        case '/':
            suffixIsExplicit = !!(unitUrl = this.resolveUrl(unitSource, undefined, true))
            break
        case '~':
            unitUrl = this.resolveUrl(`/${unitTypeCollectionName}/${unitSource.slice(1)}`, undefined, true)
            break
        default:
            if (unitSource.includes('://'))
                try {
                    suffixIsExplicit = !!(unitUrl = this.resolveUrl(new URL(unitSource).href, undefined, true))
                } catch (e) {
                    suffixIsExplicit = true
                }
            else unitUrl = this.resolveUrl(`${unitTypeCollectionName}/${unitSource}`, undefined, true)
    }
    if (!unitUrl) return
    let unitSuffix, unitModule, unit
    if (!suffixIsExplicit) {
        if (!autoResolverSuffixes[unitType]?.length) return
        const testPath = `${unitUrl.pathname}.${autoResolverSuffixes[unitType][0]}`,
            testUrl = `${unitUrl.protocol}//${unitUrl.host}${testPath}`
        if (!this.app._failedHrefs.has(testUrl))
            try {
                if ((await fetch(testUrl, { method: 'HEAD' })).ok) {
                    unitUrl.pathname = testPath
                    unitSuffix = autoResolverSuffixes[unitType][0]
                } else this.app._failedHrefs.add(testUrl)
            } catch (e) {
                this.app._failedHrefs.add(testUrl)
            }
        if (!unitSuffix)
            try {
                if (!this.app._failedHrefs.has(unitUrl.href) && (await fetch(unitUrl.href, { method: 'HEAD' })).ok) unitSuffix = true
            } catch (e) {
                this.app._failedHrefs.add(unitUrl.href)
            }
        if (!unitSuffix)
            for (const s of autoResolverSuffixes[unitType] ?? []) {
                if (unitUrl.pathname.endsWith(`.${s}`)) {
                    unitSuffix = s
                    break
                }
                const testPath = `${unitUrl.pathname}.${s}`,
                    testUrl = `${unitUrl.protocol}//${unitUrl.host}${testPath}`
                if (this.app._failedHrefs.has(testUrl)) continue
                try {
                    if ((await fetch(testUrl, { method: 'HEAD' })).ok) {
                        unitUrl.pathname = testPath
                        unitSuffix = s
                        break
                    } else this.app._failedHrefs.add(testUrl)
                } catch (e) {
                    this.app._failedHrefs.add(testUrl)
                }
            }
        if (!unitSuffix) return
    }
    const { href: unitHref, hash: unitHash, pathname: unitPathname } = unitUrl
    if (!unitSuffix)
        for (const s of autoResolverSuffixes[unitType] ?? ['js'])
            if (unitPathname.endsWith(`.${s}`)) {
                unitSuffix = s
                break
            }
    switch (unitSuffix) {
        case 'js':
        case 'wasm':
            unit = this.resolveImport(unitHref)
            break
        case 'md':
        case 'html':
        case 'css':
        case 'txt':
        case 'directives':
        case 'jsonl':
        case 'x':
        case 'xdr':
            unit = await (await fetch(unitHref)).text()
            break
        case 'json':
            unitModule = await (await fetch(unitHref)).json()
        default:
            if (!unitModule) {
                const unitHead = await fetch(unitHref, { method: 'HEAD' })
                let unitContentType = unitHead.headers.get('Content-Type')
                if (unitContentType.includes('/javascript') || unitContentType.includes('/wasm')) {
                    unit = this.resolveImport(unitHref)
                } else {
                    if (unitContentType.includes(';')) unitContentType = unitContentType.split(';').shift().trim() || undefined
                    unitModule = await this.parse(await fetch(unitHref), unitContentType)
                }
            }
            unit ??= unitHash ? (unitModule && typeof unitModule === 'object' ? unitModule[unitHash] : undefined) : unitModule
    }
    if (unit === undefined) return
    if (unit instanceof Promise) unit = await unit
    const [, unitClassName] = this.sys.unitTypeMap[unitType],
        unitClass = typeof unitClassName === 'string' ? this[unitClassName] : unitClassName
    if (unit instanceof unitClass) return unit
    return new unitClass(unitClass.normalize(unit, initParams))
}
