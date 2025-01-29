export default async function (element) {
    if (!(element instanceof HTMLElement)) return
    if ('bind' in element.dataset && this.app._anchorUnitBindings.has(element)) {
        const { unitType, key } = this.app._anchorUnitBindings.get(element)
        this.app._anchorUnitBindings.delete(element)
        delete this.app[this.sys.unitTypeMap[unitType][0]][key]
    }
    const watcher = this.app._anchorWhenWatchers.get(element)
    if (watcher) {
        if (typeof watcher?.observer?.disconnect === 'function') watcher?.observer?.disconnect()
        if (typeof watcher?.stop === 'function') watcher.stop()
    }
    if (element.children.length) {
        const promises = []
        for (const n of element.children) promises.push(this.unmountElement(n))
        await Promise.all(promises)
    }
    if (typeof element.disconnectedCallback === 'function' && this.getCustomTag(element)) element.disconnectedCallback()
}
