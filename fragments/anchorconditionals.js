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
    createWatcher = async ({ getValue, compareWith, callback, interval, useIdle, once, anchorId }) => {
        const watcher = {
            active: undefined,
            target: new EventTarget(),
            callback,
            idleHandle: null,
            interval: interval ?? 100,
            disabled: undefined,
            async checkValue() {
                if (this.disabled) return
                const isActive = doComparison(await getValue(), compareWith)
                if (isActive !== this.active) {
                    this.active = isActive
                    const container = document.getElementById(anchorId)
                    container.toggleAttribute('data-active', isActive)
                    if (this.callback) this.callback(this.active)
                    if (once) {
                        this.stop()
                        this.disabled = true
                    }
                    this.target.dispatchEvent(new CustomEvent('change', { detail: this.active }))
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
    E37: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            let currentValue = { UI: this }
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    dev: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => !!this.modules.dev
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    location: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            let currentValue = document.location
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    root: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            let currentValue = await this.flatten(anchor.getRootNode())
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    lang: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => document.documentElement.lang || navigator.language
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    cell: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            if (subConditions.length) {
                const cellName = subConditions.shift().trim()
                if (!(cellName in this.app.cells)) return false
                if (!subConditions.length) return true
                let currentValue = this.app.cells[cellName].get()
                for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
                return currentValue
            } else return this.app.cells
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    context: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            let currentValue = this.env.context
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    selector: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            const resolvedSelector = await this.resolveScopedSelector(compareWith, anchor)
            return Array.isArray(resolvedSelector) ? !!resolvedSelector.length : !!resolvedSelector
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    media: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            if (!compareWith) return true
            const mediaQuery = window.matchMedia(compareWith)
            return mediaQuery.matches
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    theme: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            const mediaQuery = window.matchMedia(`(prefers-color-scheme: ${compareWith.trim().toLowerCase()})`)
            return mediaQuery.matches
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    navigator: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            let currentValue = window.navigator
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    datetime: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        if (!subConditions.length) {
            const compareWithParts = compareWith.split(' '),
                compareWithTimestamp = new Date(Date.parse(compareWithParts.pop())).valueOf()
            compareWithParts.push(`${compareWithTimestamp}`)
            compareWith = compareWithParts.join(' ')
        }
        compareWith = compareWith.trim()
        const getValue = async () => {
            const now = new Date()
            let currentValue
            if (subConditions.length) {
                const compareWithDate = new Date(Date.parse(compareWithParts.pop() || Date.now())),
                    timeCondition = subConditions.shift(),
                    timeConditionMethod = `get${timeCondition[0].toUpperCase()}${timeCondition.slice(1)}`
                if (typeof Date.prototype[timeConditionMethod] !== 'function') return false
                compareWithParts.push(`${compareWithDate[timeConditionMethod]()}`)
                currentValue = now[timeConditionMethod]()
            } else currentValue = now.valueOf()
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    visible: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            const rect = anchor.getBoundingClientRect()
            return (
                rect.top >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.left >= 0 &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            )
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    active: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        if (compareWith !== 'visible' && compareWith !== 'hidden') compareWith = normalizeCompareWith(compareWith) ? 'visible' : 'hidden'
        const getValue = async () => document.visibilityState
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    document: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            let currentValue = document
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    documentElement: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            let currentValue = document.documentElement
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
    window: async ({ anchor, subConditions, compareWith, getWatcher, anchorId, useIdle, once, interval }) => {
        const getValue = async () => {
            let currentValue = window
            for (const condition of subConditions) currentValue = currentValue?.[condition.trim()]
            return currentValue
        }
        return getWatcher ? await createWatcher({ anchor, getValue, compareWith, useIdle, interval, once, anchorId }) : doComparison(await getValue(), compareWith)
    },
}
