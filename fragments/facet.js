const checkConditions = function () {
    let running = true
    for (const k in this.conditions) {
        for (const kk in this.conditions[k]) if (!this.conditions[k][kk]) { running = false; break }
        if (!running) break
    }
    this.running = running
}, regexp = {
    defaultValue: /\s+\?\?\s+(.+)\s*$/, label: /^([\@\#]?[a-zA-Z0-9]+[\!\?]?):\s+/,
    directiveHandleMatch: /^([A-Z][A-Z0-9]*)::\s(.*)/, directiveSplitter: /\n(?!\s+>>)/gm, directiveSegmenter: /\s+>>\s+/g,
}

export default {
    parseDirectives: async function (directives) {
        const { E37 } = this.constructor, { UI } = E37
        directives = directives.trim()
        if (!directives) return
        const targetNames = { cell: UI.Cell, field: UI.Field, '#': UI.Cell, '@': UI.Field }, { interpreters } = UI.env
        let statementIndex = -1
        for (let directive of directives.split(regexp.directiveSplitter)) {
            directive = directive.trim()
            if (!directive || directive.startsWith('* ')) continue
            statementIndex++
            let stepIndex = -1, handle, handleMatch
            if (handleMatch = directive.match(regexp.directiveHandleMatch)) [, handle, directive] = handleMatch
            directive = directive.trim()
            const statement = { handle, index: statementIndex, labels: {}, steps: [] }
            for (const segment of directive.split(regexp.directiveSegmenter)) {
                if (!segment) continue
                stepIndex++
                let handlerExpression = segment, label, defaultExpression
                const labelMatch = handlerExpression.match(regexp.label)
                if (labelMatch) {
                    label = labelMatch[1].trim()
                    handlerExpression = handlerExpression.slice(labelMatch[0].length).trim()
                }
                const defaultExpressionMatch = handlerExpression.match(regexp.defaultValue)
                if (defaultExpressionMatch) {
                    defaultExpression = defaultExpressionMatch[1].trim()
                    handlerExpression = handlerExpression.slice(0, defaultExpressionMatch.index).trim()
                    let name
                    if (defaultExpression.length > 1) switch (defaultExpression[0]) {
                        case '@': new UI.Field(defaultExpression.slice(1).trim(), undefined, this); break
                        case '#': new UI.Cell(defaultExpression.slice(1).trim()); break
                    }
                }
                label ||= `${stepIndex}`
                const labelModeFlag = label[label.length - 1], labelMode = labelModeFlag === '!' ? 'force' : ((labelModeFlag === '?') ? 'silent' : undefined)
                if (labelMode) {
                    label = label.slice(0, -1).trim()
                    labelMode = labelMode
                }
                label = label
                switch (label[0]) {
                    case '@': case '#':
                        let n = label.slice(1).trim()
                        if (n) new targetNames[label[0]](n, this)
                        break
                    default:
                        const ln = label.trim()
                        if (ln) statement.labels[ln] ??= undefined
                }
                let stepEnvelope
                for (const [matcher, interpreter] of interpreters) {
                    const { parser, name } = interpreter
                    if (matcher.test(handlerExpression) && (typeof parser === 'function')) {
                        stepEnvelope = { name, interpreter: matcher.toString(), descriptor: (await parser.call(E37, handlerExpression)) ?? {}, variables: {} }
                        if (name === 'state') {
                            const { target, shape } = stepEnvelope.descriptor
                            switch (shape) {
                                case 'single':
                                    new targetNames[target.type](target.name, this)
                                    break
                                case 'array':
                                    for (const t of target) new targetNames[t.type](t.name, this)
                                    break
                                case 'object':
                                    for (const key in target) new targetNames[target[key].type](target[key].name, this)
                                    break
                            }
                        }
                        break
                    }
                }
                if (stepEnvelope === undefined) {
                    if (E37.UI.modules.dev) E37.UI.modules.dev.print(`No matching interpreter is available for the expression at position '${statementIndex}-${stepIndex}' in: ${handlerExpression}`, 'warning')
                    let matcher, name = 'console'
                    for (const [k, v] of interpreters) if (v.name === name) { matcher = k; break }
                    if (!matcher) continue
                    stepEnvelope = { name, interpreter: 'undefined', descriptor: { verbose: true }, variables: {} }
                }
                for (const p in stepEnvelope.descriptor) if (UI.isWrappedVariable(stepEnvelope.descriptor[p])) stepEnvelope.variables[p] = true
                if (Object.keys(stepEnvelope.variables).length) Object.freeze(stepEnvelope.variables)
                else delete stepEnvelope.variables
                Object.freeze(stepEnvelope.descriptor)
                const step = { label, labelMode, stepEnvelope: Object.freeze(stepEnvelope) }
                if (defaultExpression) step.defaultExpression = defaultExpression
                statement.labels[label] ??= undefined
                statement.labels[`${stepIndex}`] ??= undefined
                statement.steps.push(Object.freeze(step))
            }
            Object.seal(statement.labels)
            Object.freeze(statement.steps)
            Object.freeze(statement)
            this.statements.push(statement)
        }
    },
    setupConditions: function (conditions) {
        const { E37 } = this.constructor, { UI } = E37
        let { dom, location, cells, fields, host } = conditions, signal = this.controller.signal
        if (dom && ((typeof dom === 'string') || UI.isPlainObject(dom))) {
            if (typeof dom === 'string') dom = { [dom]: true }
            for (const scopedSelector in dom) {
                const { scope: scopeStatement, selector } = UI.resolveScopedSelector(scopedSelector), scope = UI.resolveScope(scopeStatement, this.root),
                    check = !!dom[scopedSelector]
                if (scope) {
                    this.conditions.dom[scopedSelector] = (!!(UI.resolveSelector(selector, scope)?.length) === check)
                    const attributeFilter = selector.match(this.sys.regexp.extractAttributes), attributes = !!attributeFilter.length
                    this.conditionsAnchorObservers[scopedSelector] = new MutationObserver(() => {
                        this.conditions.dom[scopedSelector] = (!!(UI.resolveSelector(selector, scope)?.length) === check)
                        checkConditions.call(this)
                    })
                    this.conditionsAnchorObservers[k].observe(scope, { subtree: true, childList: true, attributes, attributeFilter: (attributes ? attributeFilter : undefined) })
                }
            }
        }
        if (location && ((typeof location === 'string') || UI.isPlainObject(location))) {
            if (typeof location === 'string') location = { ...UI.resolveUrl(location, undefined, true) }
            for (const k in document.location) {
                if (!location[k]) continue
                if (k === 'hash') {
                    const r = new RegExp(location.hash)
                    window.addEventListener('hashchange', () => {
                        this.conditions.location.hash = r.test(document.location.hash)
                        checkConditions.call(this)
                    }, { signal })
                    this.conditions.location.hash = r.test(document.location.hash)
                } else if (typeof document.location[k] === 'string') {
                    const r = new RegExp(location[k])
                    this.conditions.location[k] = r.test(document.location[k])
                }
            }
        }
        const stateTypeMap = { Cell: [cells, 'cells'], Field: [fields, 'fields'] }
        for (const stateType in stateTypeMap) {
            let [stateSet, stateConditionLabel] = stateTypeMap[stateType]
            if (stateSet && ((typeof stateSet === 'string') || UI.isPlainObject(stateSet))) {
                if (typeof stateSet === 'string') stateSet = { [stateSet]: true }
                for (const name in stateSet) {
                    const stateInstance = new UI[stateType](name), check = !!stateSet[name]
                    stateInstance.eventTarget.addEventListener('change', () => {
                        this.conditions[stateConditionLabel][name] = (!!stateInstance.value === check)
                        checkConditions.call(this)
                    }, { signal })
                    this.conditions[stateConditionLabel][name] = (!!stateInstance.value === check)
                }
            }
        }
        if (host && root && (root instanceof ShadowRoot) && ((typeof host === 'string') || UI.isPlainObject(host))) {
            if (typeof host === 'string') host = { [host]: true }
            const hostComponentInstance = root.host
            for (const eventName in host) {
                const check = host[eventName], isBool = typeof check === 'boolean', isString = typeof check === 'string'
                if (!isBool && !isString) continue
                this.conditions.host[eventName] = isBool ? check : !!hostComponentInstance[check]
                hostComponentInstance.addEventListener(eventName, event => {
                    this.conditions.host[eventName] = isBool ? (event.detail == check) : !!hostComponentInstance[check]
                    checkConditions.call(this)
                }, { signal })
            }
        }
        checkConditions.call(this)
    }
}