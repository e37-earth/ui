export default {
    run: async function (input, promptTemplateKey, envelope) {
        const { E37 } = this.constructor, { UI } = E37
        if (!this.engine) return
        if (typeof input === 'string') {
            const promptTemplate = promptTemplateKey ? (this.promptTemplates[promptTemplateKey] ?? '$') : '$'
            input = UI.resolveVariable(promptTemplate, { ...envelope, value: input }, { merge: true })
        }
        return this.engine(input)
    }
}