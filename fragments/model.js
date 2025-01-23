export default {
    load: async function (library, load, options) {
        const { E37 } = this.constructor, { UI } = E37
        if (this.loaded) return true
        this.library ??= await UI.resolveUnit(library, 'library')
        if (!this.library) return
        this.options = options ?? {}
        this.loader ??= load.bind(this)
        if (!this.loader) return
        this.loaded = !!(this.engine ??= (await this.loader(this.library, (this.options.load ?? {}))))
        return this.loaded
    },
    run: async function (input) {
        const { E37 } = this.constructor, { UI } = E37
        if (!this.loaded) await UI.Job.waitComplete(`model:${this.name}`, Infinity)
        return this.inference(input, this.engine, this.options.inference ?? {})
    }
}