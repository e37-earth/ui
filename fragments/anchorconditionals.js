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
    }

export default {
    E37: async (anchorElement, subConditions, compareWith, isWhen) => {
        let currentValue = { UI: this }
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    dev: async (anchorElement, subConditions, compareWith, isWhen) => !!this.modules.dev === normalizeCompareWith(compareWith || true),
    location: async (anchorElement, subConditions, compareWith, isWhen) => {
        let currentValue = document.location
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    root: async (anchorElement, subConditions, compareWith, isWhen) => {
        let currentValue = await this.flatten(anchorElement.getRootNode())
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    lang: async (anchorElement, subConditions, compareWith, isWhen) => {
        return doComparison(document.documentElement.lang || navigator.language, compareWith)
    },
    cell: async (anchorElement, subConditions, compareWith, isWhen) => {
        if (subConditions.length) {
            const cellName = subConditions.shift().trim()
            if (!(cellName in this.app.cells)) return false
            if (!subConditions.length) return true
            let currentValue = this.app.cells[cellName].get()
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return doComparison(currentValue, compareWith)
        } else return doComparison(this.app.cells, compareWith)
    },
    context: async (anchorElement, subConditions, compareWith, isWhen) => {
        let currentValue = this.env.context
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    selector: async (anchorElement, subConditions, compareWith, isWhen) => {
        const resolvedSelector = await this.resolveScopedSelector(compareWith, anchorElement)
        return Array.isArray(resolvedSelector) ? !!resolvedSelector.length : !!resolvedSelector
    },
    media: async (anchorElement, subConditions, compareWith, isWhen) => {
        if (!compareWith) return true
        const mediaQuery = window.matchMedia(compareWith)
        return mediaQuery.matches
    },
    theme: async (anchorElement, subConditions, compareWith, isWhen) => {
        const mediaQuery = window.matchMedia(`(prefers-color-scheme: ${compareWith.trim().toLowerCase()})`)
        return mediaQuery.matches
    },
    navigator: async (anchorElement, subConditions, compareWith, isWhen) => {
        let currentValue = window.navigator
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    datetime: async (anchorElement, subConditions, compareWith, isWhen) => {
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
    visible: async (anchorElement, subConditions, compareWith, isWhen) => {
        const rect = anchorElement.getBoundingClientRect(),
            anchorIsVisible =
                rect.top >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.left >= 0 &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        return anchorIsVisible === normalizeCompareWith(compareWith)
    },
    active: async (anchorElement, subConditions, compareWith, isWhen) => {
        if (compareWith !== 'visible' && compareWith !== 'hidden') compareWith = normalizeCompareWith(compareWith) ? 'visible' : 'hidden'
        return document.visibilityState === compareWith
    },
    document: async (anchorElement, subConditions, compareWith, isWhen) => {
        let currentValue = document
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    documentElement: async (anchorElement, subConditions, compareWith, isWhen) => {
        let currentValue = document.documentElement
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
    window: async (anchorElement, subConditions, compareWith, isWhen) => {
        let currentValue = window
        for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
        return doComparison(currentValue, compareWith)
    },
}
