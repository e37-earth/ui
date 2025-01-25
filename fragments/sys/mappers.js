const mappers = {
    '#': (el, mode, v, p, options = {}) => el[`${mode}Attribute`]('id', v),
    $attributes: function (el, mode, v, p, options = {}) {
        if (!(el && (el instanceof HTMLElement))) return
        const { style, isComputed, get = 'getAttribute', set = 'setAttribute', remove = 'removeAttribute', defaultAttribute = 'name', toggle = 'toggleAttribute', filter } = options,
            target = style ? (isComputed ? window.getComputedStyle(el) : el.style) : el, writable = style ? ((mode === 'set') && !isComputed) : (mode === 'set'), vIsObject = typeof v === 'object'
        p &&= this.toKebabCase(p)
        if (writable) {
            if (p) return target[v == null ? remove : ((!style && (typeof v === 'boolean')) ? toggle : set)](p, v)
            if (vIsObject) for (const k in v) target[v[k] == null ? remove : ((!style && (typeof v[k] === 'boolean')) ? toggle : set)](this.toKebabCase(k), v[k])
            if (vIsObject || style) return
            return target[(typeof v === 'boolean') ? toggle : set](p || defaultAttribute, v)
        }
        if (mode !== 'get') return
        if (p) return target[get](p)
        const r = {}, iterator = style ? target : el.attributes
        if (iterator.length) for (let i = 0, k, l = iterator.length; i < l; i++) {
            k = iterator[i]
            if (filter && !k.startsWith(filter)) continue
            r[k] = target[get](k)
            if (!style && (r[k] === '')) r[k] = true
        }
        return r
    },
    '@': '$attributes',
    $data: function (el, mode, v, p, options = {}) {
        const { filter = 'data-', defaultAttribute = 'data-value' } = options
        if (!p && !(v && (typeof v === 'object'))) return v ? (el.value = v) : (el.value = '')
        if (p && !p.startsWith(filter)) p = `${filter}${p}`
        if (v && typeof v === 'object') for (const k in v) if (k && !k.startsWith(filter)) {
            v[`${filter}${k}`] = v[k]
            delete v[k]
        }
        return mappers.$attributes.call(this, el, mode, v, p, { defaultAttribute, filter })
    },
    '$': '$data',
    $aria: function (el, mode, v, p, options = {}) { return mappers.$data.call(this, el, mode, v, p, { defaultAttribute: 'aria-label', filter: 'aria-' }) },
    '*': '$aria',
    $style: function (el, mode, v, p, options = {}) { return mappers.$attributes.call(this, el, mode, v, p, { style: true, isComputed: false, get: 'getProperty', set: 'setProperty', remove: 'removeProperty' }) },
    '%': '$style',
    $computed: function (el, mode, v, p, options = {}) { return (mode === 'get') ? mappers.$attributes.call(this, el, mode, v, p, { style: true, isComputed: true, get: 'getProperty' }) : undefined },
    '&': '$computed',
    $content: function (el, mode, v, p, options = {}) { return (mode === 'set') ? (el[this.sys.regexp.isHTML.test(v) ? 'innerHTML' : 'textContent'] = v) : (this.sys.regexp.isHTML.test(el.textContent) ? el.innerHTML : el.textContent) },
    '.': '$content',
    $textContent: function (el, mode, v, p, options = {}) { return (mode === 'set') ? (el.textContent = v) : el.textContent },
    '..': '$textContent',
    $text: function (el, mode, v, p, options = {}) { return (mode === 'set') ? (el.innerText = v) : el.innerText },
    '...': '$text',
    $html: function (el, mode, v, p, options = {}) {
        if (mode !== 'set') return el.innerHTML
        let childElement
        const promises = []
        if (Array.isArray(v)) {
            for (const item of v) {
                const itemNode = item?.$tag ? document.createElement(item.$tag) : (p ? document.createElement(p) : new DocumentFragment()), itemPromises = []
                if (item?.$tag) delete item.$tag
                itemPromises.push(this.render(itemNode, item))
                promises.push(Promise.all(itemPromises).then(() => el.append(itemNode)))
            }
        } else if (this.isPlainObject(v)) {
            for (const k in v) promises.push(this.render(childElement, v[k]))
        } else {
            childElement.innerHTML = `${v}`
        }
        return Promise.all(promises)
    },
    '<>': '$html',
    $tag: function (el, mode, v, p, options = {}) {
        if (!(el && (el instanceof HTMLElement))) return
        return (mode === 'set') ? (v == null ? el.removeAttribute('is') : (el.setAttribute('is', v.toLowerCase()))) : ((value.getAttribute('is') || value.tagName).toLowerCase())
    },
    $parent: function (el, mode, v, p, options = {}) {
        if (!(el && (el instanceof HTMLElement))) return
        el = this.app._components.nativesFromVirtuals.get(el) ?? el
        return (mode === 'set') ? undefined : this.flatten(p ? el.closest(p) : el.parentElement)
    },
    '^': '$parent',
    $position: function (el, mode, v, p, options = {}) {
        const { isVoidElement } = options
        el = this.app._components.nativesFromVirtuals.get(el) ?? el
        if (mode !== 'set') {
            const traversers = new Set(['nextElementSibling', 'previousElementSibling', 'parentElement', 'firstElementChild', 'lastElementChild', 'children']),
                traversersMap = { after: 'nextElementSibling', before: 'previousElementSibling', parent: 'parentElement', prepend: 'firstElementChild', append: 'lastElementChild' }
            let traverser = traversersMap[p] ?? p
            if (isVoidElement) traverser = ({ firstElementChild: 'previousElementSibling', lastElementChild: 'nextElementSibling', children: '' })[traverser] ?? traverser
            if (!traversers.has(traverser)) return
            if (mode === 'has') return !!el[traverser]
            if (mode === 'get') return this.flatten(el[traverser])
        }
        const inserters = new Set(['after', 'before', 'prepend', 'append', 'replaceWith', 'replaceChildren']),
            insertersMap = { nextElementSibling: 'after', previousElementSibling: 'before', firstElementChild: 'prepend', lastElementChild: 'append', children: 'replaceChildren', replace: 'replaceWith' }
        let inserter = insertersMap[p] ?? p
        if (isVoidElement) inserter = ({ prepend: 'before', append: 'after', replaceChildren: 'replaceWith' })[inserter] ?? inserter
        if (!inserters.has(inserter)) return
        const fragment = new DocumentFragment(), promises = []
        if (Array.isArray(v)) {
            for (const item of v) {
                const itemNode = item?.$tag ? document.createElement(item.$tag) : new DocumentFragment(), itemPromises = []
                if (item?.$tag) delete item.$tag
                itemPromises.push(this.render(itemNode, item))
                promises.push(Promise.all(itemPromises).then(() => fragment.append(itemNode)))
            }
        } else if (this.isPlainObject(v)) promises.push(this.render(fragment, v))
        else if (v instanceof HTMLTemplateElement) fragment.append(v.content.cloneNode(true))
        else if (v instanceof HTMLElement) fragment.append(v.cloneNode(true))
        else fragment.innerHTML = `${v}`
        return Promise.all(promises).then(() => el[inserter](fragment))
    },
    $event: function (el, mode, v, p, options = {}) { return (mode === 'set') ? undefined : (p ? this.flatten(options?.detail?.[p]) : this.flatten(options)) },
    '!': '$event',
    $form: function (el, mode, v, p, options = {}) {
        if (!(el instanceof HTMLElement)) return
        const { tagName } = el, vIsNull = v == null, vIsObject = !vIsNull && (typeof v === 'object')
        switch (tagName.toLowerCase()) {
            case 'form': case 'fieldset':
                if (p) return mappers.$form.call(this, el.querySelector(`[name="${p}"]`), mode, v)
                if (!vIsObject) return
                const r = {}
                for (const fieldName in v) r[fieldName] = mappers.$form.call(this, el.querySelector(`[name="${fieldName}"]`), mode, v[fieldName])
                return r
            default:
                const { type, name } = el
                switch (type) {
                    case undefined: return
                    case 'checkbox': case 'radio':
                        const inputs = el.closest('form,fieldset').querySelectorAll(`[name="${name}"][type=${type}]`)
                        if (!inputs) return
                        const isCheckbox = type === 'checkbox', isRadio = !isCheckbox
                        if (mode === 'set') {
                            const vIsArray = Array.isArray(v), useV = vIsObject ? v : (vIsArray ? {} : { [v]: true })
                            if (vIsArray) for (const f of v) useV[f] = true
                            for (const c of inputs) if ((c.checked = !!useV[c.value]) && isRadio) return
                            return
                        }
                        const r = isCheckbox ? [] : undefined
                        if (isRadio) for (const f of inputs) if (f.checked) return f.value
                        if (isRadio) return
                        for (const f of inputs) if (f.checked) r.push(f.value)
                        return r
                    default:
                        return (mode === 'set') ? (el.value = v) : el.value
                }
        }
    },
    '[]': '$form',
    $microdata: function (el, mode, v, p, options = {}) {
        if (!((el instanceof HTMLElement) && el.hasAttribute('itemscope'))) return
        if (p) {
            const propElement = el.querySelector(`[itemprop="${p}"]`)
            if (!propElement) return
            return (mode === 'set') ? this.render(propElement, v) : this.flatten(propElement)
        }
        if (mode === 'set') {
            if (this.isPlainObject(v)) for (const k in v) mappers.$microdata.call(this, el, mode, v[k], k)
            return
        }
        const r = {}, promises = []
        for (const propElement of el.querySelectorAll('[itemprop]')) promises.push(this.flatten(propElement).then(v => (r[propElement.getAttribute('itemprop')] = v)))
        return Promise.all(promises).then(() => r)
    },
    '{}': '$microdata',
    $options: function (el, mode, v, p, options = {}) {
        if (!((el instanceof HTMLSelectElement) || (el instanceof HTMLOptGroupElement) || (el instanceof HTMLDataListElement))) return
        if (mode === 'set') {
            const optionElements = [], isOptGroup = el instanceof HTMLOptGroupElement
            if (v && (typeof v === 'object')) {
                const vIsArray = Array.isArray(v), optionsMap = vIsArray ? {} : v
                if (vIsArray) for (const f of v) optionsMap[f] = f
                for (const k in optionsMap) {
                    const vv = optionsMap[k]
                    let optionElement
                    if (vv && typeof vv === 'object') {
                        if (!isOptGroup) continue
                        optionElement = document.createElement('optgroup')
                        optGroupElement.setAttribute('label', k)
                        mappers.$options.call(this, optGroupElement, mode, vv)
                    } else {
                        optionElement = document.createElement('option')
                        if (!vIsArray) optionElement.setAttribute('value', k)
                        optionElement.textContent = vv
                    }
                    optionElements.push(optionElement)
                }
            }
            return el.replaceChildren(...optionElements)
        }
        const rObj = {}, rArr = []
        let isMap
        for (const optionElement of el.children) {
            isMap ||= optionElement.hasAttribute('value')
            const optionText = optionElement.textContent.trim(), optionValue = optionElement.getAttribute('value') || optionText
            rObj[optionValue] = optionText
            if (!isMap) rArr.push(optionText)
        }
        return isMap ? rObj : rArr
    },
    $table: function (el, mode, v, p, options = {}) {
        if (!(el instanceof HTMLTableElement || el instanceof HTMLTableSectionElement)) return
        if (mode === 'set') {
            if (!Array.isArray(v)) return
            if (el instanceof HTMLTableElement) {
                if (v.length === 0) return
                const headers = Object.keys(v[0])
                if (headers.length === 0) return
                let thead = el.querySelector('thead')
                if (!thead) {
                    thead = document.createElement('thead')
                    el.prepend(thead)
                }
                const headerRow = document.createElement('tr'), ths = []
                for (const header of headers) {
                    const th = document.createElement('th')
                    th.textContent = header
                    ths.push(th)
                }
                headerRow.replaceChildren(...ths)
                thead.replaceChildren(headerRow)
                let tbody = el.querySelector('tbody')
                if (!tbody) {
                    tbody = document.createElement('tbody')
                    el.appendChild(tbody)
                }
                const rows = []
                for (const item of v) {
                    const tr = document.createElement('tr'), tds = []
                    for (const header of headers) {
                        const td = document.createElement('td')
                        td.textContent = item[header] !== undefined ? item[header] : ''
                        tds.push(td)
                    }
                    tr.replaceChildren(...tds)
                    rows.push(tr)
                }
                tbody.replaceChildren(...rows)
            } else if (el instanceof HTMLTableSectionElement && el.tagName.toLowerCase() === 'tbody') {
                const rows = []
                for (const rowData of v) {
                    const tr = document.createElement('tr'), tds = []
                    for (const cellData of rowData) {
                        const td = document.createElement('td')
                        td.textContent = cellData
                        tds.push(td)
                    }
                    tr.replaceChildren(...tds)
                    rows.push(tr)
                }
                el.replaceChildren(...rows)
            }
            return
        }
        if (el instanceof HTMLTableElement) {
            const thead = el.querySelector('thead'), tbody = el.querySelector('tbody'), promises = []
            if (!thead || !tbody) return []
            const headers = [], rows = []
            for (const th of thead.querySelectorAll('th')) headers.push(th.textContent.trim())
            for (const tr of tbody.querySelectorAll('tr')) {
                const cells = tr.querySelectorAll('td'), rowObj = {}
                let index = -1
                for (const header of headers) promises.push(this.flatten(cells[++index]).then(v => rowObj[header] = v))
                rows.push(rowObj)
            }
            return Promise.all(promises).then(() => rows)
        } else if (el instanceof HTMLTableSectionElement && el.tagName.toLowerCase() === 'tbody') {
            const rows = []
            for (const tr of el.querySelectorAll('tr')) {
                const row = []
                for (const td of tr.querySelectorAll('td')) row.push(this.flatten(td))
                rows.push(Promise.all(row))
            }
            return Promise.all(rows)
        }
        return
    },
}

export default {
    processElementMapper: async function (element, mode, prop, value, isVoidElement) {
        prop = prop.trim()
        if (value instanceof HTMLElement) {
            if (!prop.includes('::')) prop = isVoidElement ? `${prop}::replaceWith` : `${prop}::replaceChildren`
        }
        element = this.app._components.nativesFromVirtuals.get(element) ?? element
        if (prop in mappers) return (mode === 'has') || (typeof mappers[prop] === 'string' ? mappers[mappers[prop]] : mappers[prop]).call(this, element, mode, value, prop, { isVoidElement })
        const propFlag = prop[0], propMain = prop.slice(1)
        if (propFlag in mappers) return (typeof mappers[propFlag] === 'string' ? mappers[mappers[propFlag]] : mappers[propFlag]).call(this, element, mode, value, propMain, { isVoidElement })
        if ((propFlag === '[') && propMain.endsWith(']')) return mappers.$form.call(this, element, mode, value, propMain.slice(0, -1).trim(), { isVoidElement })
        if ((propFlag === '{') && propMain.endsWith('}')) return mappers.$microdata.call(this, element, mode, value, propMain.slice(0, -1).trim(), { isVoidElement })
        if (propFlag === ':' && propMain[0] === ':') return mappers.$position.call(this, element, mode, value, propMain.slice(1).trim(), { isVoidElement })
        if (propFlag === '<' && propMain.endsWith('>')) return mappers.$html.call(this, element, mode, value, propMain.slice(0, -1).trim(), { isVoidElement })
        return (mode === 'has') ? (prop in element) : ((mode === 'set') ? (element[prop] = value) : this.flatten(element[prop]))
    }
}
