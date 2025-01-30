const voidElementTags = Object.freeze({
    area: 'href',
    base: 'href',
    br: null,
    col: 'span',
    embed: 'src',
    hr: 'size',
    img: 'src',
    input: 'value',
    link: 'href',
    meta: 'content',
    param: 'value',
    source: 'src',
    track: 'src',
    video: 'src',
    wbr: null,
})

export default async function (element, data) {
    const isElement = element instanceof HTMLElement,
        isFragment = element instanceof DocumentFragment
    let tag = isElement ? element.tagName.toLowerCase() : undefined
    if (!(isElement || isFragment)) return
    element = this.app._components.virtualsFromNatives.get(element) ?? element
    switch (data) {
        case null:
        case undefined:
            if (isElement) {
                for (const p of ['checked', 'selected'])
                    if (p in element) {
                        element[p] = false
                        return element
                    }
                if ('value' in element) {
                    element.value = ''
                    return element
                }
                if (tag in voidElementTags) {
                    element.removeAttribute(voidElementTags[tag])
                    return element
                }
            }
            element.textContent = ''
            return element
        case true:
        case false:
            if (isElement) {
                for (const p of ['checked', 'selected', 'value'])
                    if (p in element) {
                        element[p] = data
                        return element
                    }
                if (tag in voidElementTags) {
                    element.toggleAttribute(voidElementTags[tag])
                    return element
                }
            }
            element.textContent = data
            return element
    }
    if (typeof data !== 'object') {
        if (isElement) {
            for (const p of ['checked', 'selected'])
                if (p in element) {
                    element[p] = !!data
                    return element
                }
            if ('value' in element) {
                element.value = data
                return element
            }
            if (tag in voidElementTags) {
                element.setAttribute(voidElementTags[tag], data)
                return element
            }
        }
        element[typeof data === 'string' && this.sys.regexp.isHTML.test(data) ? 'innerHTML' : 'textContent'] = data
        return element
    }
    const { processElementMapper } = await this.runFragment('sys/mappers')
    if (Array.isArray(data)) {
        const promises = []
        for (const item of data) promises.push(this.render(element, item))
        return await Promise.all(promises)
    } else if (this.isPlainObject(data)) {
        const promises = {}
        for (const p in data) {
            if (p[0] === ' ' || p.trimStart().slice(0, 6) === ':scope' || p.includes('|')) {
                let target = await this.resolveScopedSelector(p.trim(), element)
                if (!Array.isArray(target)) target = [target]
                for (const t of target) {
                    if (!(t instanceof HTMLElement)) continue
                    promises[p] = this.render(t, data[p])
                }
                continue
            } else promises[p] = processElementMapper.call(this, element, 'set', p, data[p], tag in voidElementTags)
        }
        const resolvedValues = await Promise.all(Object.values(promises))
        let i = 0
        for (const key of Object.keys(promises)) promises[key] = resolvedValues[i++]
        return promises
    } else return processElementMapper.call(this, element, 'set', key, data, tag in voidElementTags)
}
