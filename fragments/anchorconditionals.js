const doComparison = (currentValue, compareWith) => {
        compareWith = normalizeCompareWith(compareWith)
        switch (typeof currentValue) {
            case 'string':
                return new RegExp(compareWith).test(currentValue)
            case 'number':
                if (typeof compareWith === 'string') {
                    if (compareWith.startsWith('=')) return currentValue == compareWith.slice(1).trim()
                    if (compareWith.startsWith('<=')) return currentValue <= compareWith.slice(2).trim()
                    if (compareWith.startsWith('>=')) return currentValue >= compareWith.slice(2).trim()
                    if (compareWith.startsWith('<')) return currentValue < compareWith.slice(1).trim()
                    if (compareWith.startsWith('>')) return currentValue > compareWith.slice(1).trim()
                }
                return currentValue == compareWith
            case 'boolean':
                return currentValue === !!compareWith
            default:
                if (currentValue == null) return compareWith == null
                if (currentValue && typeof currentValue === 'function') {
                    try {
                        return !!currentValue.call(compareWith)
                    } catch (e) {
                        return false
                    }
                }
                if (currentValue && typeof currentValue === 'object') return compareWith in currentValue
                return false
        }
    },
    normalizeCompareWith = compareWithRaw => {
        const compareWithRawTrimmed = compareWithRaw.trim()
        switch (compareWithRawTrimmed) {
            case 'null':
                return null
            case '':
            case 'true':
                return true
            case 'false':
                return false
            default:
                if (!isNaN(compareWithRawTrimmed) && compareWithRawTrimmed.trim() !== '') return Number(compareWithRawTrimmed)
                return compareWithRawTrimmed
        }
    },
    createWatcher = async ({ getValue, compareWith, callback, interval = 100, useIdle = true }) => {
        const watcher = {
            active: undefined,
            target: new EventTarget(),
            callback,
            idleHandle: null,
            interval,
            checkValue() {
                const currentValue = getValue(),
                    isActive = doComparison(currentValue, compareWith)
                if (isActive !== this.active) {
                    this.active = isActive
                    this.target.dispatchEvent(new CustomEvent('change', { detail: this.active }))
                    if (this.callback) this.callback(this.active)
                }
            },
            runIdleLoop() {
                const run = deadline => {
                    if (deadline.timeRemaining() > 0) this.checkValue()
                    this.idleHandle = window.requestIdleCallback(run, { timeout: this.interval })
                }
                this.idleHandle = window.requestIdleCallback(run, { timeout: this.interval })
            },
            start() {
                if (window.requestIdleCallback && useIdle) this.runIdleLoop()
                else this.intervalId = setInterval(() => this.checkValue(), this.interval)
            },
            stop() {
                if (window.cancelIdleCallback && useIdle) {
                    cancelIdleCallback(this.idleHandle)
                    this.idleHandle = null
                } else {
                    clearInterval(this.intervalId)
                    this.intervalId = null
                }
            },
        }
        return watcher
    }

export default {
    E37: async (anchorElement, subConditions, compareWith, getWatcher) => {
        const getValue = () => {
            let currentValue = { UI: this }
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ getValue, compareWith, interval: 100, useIdle: true }) : doComparison(getValue(), compareWith)
    },
    dev: async (anchorElement, subConditions, compareWith, whenCallback, once) => !!this.modules.dev === normalizeCompareWith(compareWith || true),
    location: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        let currentValue = document.location
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    root: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        let currentValue = await this.flatten(anchorElement.getRootNode())
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    lang: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        return doComparison(document.documentElement.lang || navigator.language, compareWith)
    },
    cell: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        if (subConditions.length) {
            const cellName = subConditions.shift().trim()
            if (!(cellName in this.app.cells)) return false
            if (!subConditions.length) return true
            let currentValue = this.app.cells[cellName].get()
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return doComparison(currentValue, compareWith)
        } else return doComparison(this.app.cells, compareWith)
    },
    context: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        let currentValue = this.env.context
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    selector: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        const resolvedSelector = await this.resolveScopedSelector(compareWith, anchorElement)
        return Array.isArray(resolvedSelector) ? !!resolvedSelector.length : !!resolvedSelector
    },
    media: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        if (!compareWith) return true
        const mediaQuery = window.matchMedia(compareWith)
        return mediaQuery.matches
    },
    theme: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        const mediaQuery = window.matchMedia(`(prefers-color-scheme: ${compareWith.trim().toLowerCase()})`)
        return mediaQuery.matches
    },
    navigator: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        let currentValue = window.navigator
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    datetime: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        const now = new Date(),
            compareWithParts = compareWith.split(' ')
        let currentValue
        if (subConditions.length) {
            const compareWithDate = new Date(Date.parse(compareWithParts.pop() || Date.now())),
                timeCondition = subConditions.shift(),
                timeConditionMethod = `get${timeCondition[0].toUpperCase()}${timeCondition.slice(1)}`
            if (typeof Date.prototype[timeConditionMethod] !== 'function') return false
            compareWithParts.push(`${compareWithDate[timeConditionMethod]()}`)
            currentValue = now[timeConditionMethod]()
        } else {
            const compareWithTimestamp = new Date(Date.parse(compareWithParts.pop())).valueOf()
            compareWithParts.push(`${compareWithTimestamp}`)
            currentValue = now.valueOf()
        }
        return doComparison(currentValue, compareWithParts.join(' ').trim())
    },
    visible: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        const rect = anchorElement.getBoundingClientRect(),
            anchorIsVisible =
                rect.top >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.left >= 0 &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        return anchorIsVisible === normalizeCompareWith(compareWith)
    },
    active: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        if (compareWith !== 'visible' && compareWith !== 'hidden') compareWith = normalizeCompareWith(compareWith) ? 'visible' : 'hidden'
        return document.visibilityState === compareWith
    },
    document: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        let currentValue = document
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    documentElement: async (anchorElement, subConditions, compareWith, whenCallback, once) => {
        let currentValue = document.documentElement
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    window: async (anchorElement, subConditions, compareWith, getWatcher) => {
        const getValue = () => {
            let currentValue = window
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ getValue, compareWith, interval: 100, useIdle: true }) : doComparison(getValue(), compareWith)
    },
}
