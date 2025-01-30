export default {
    use: async function (slug, envelope, lang) {
        const { E37 } = this.constructor,
            { UI } = E37
        if (typeof slug === 'string') {
            slug = UI.resolveVariable(slug, envelope, { merge: true })
            if (lang && typeof lang === 'string') slug = `${UI.resolveVariable(lang, envelope, { merge: true })}/${slug}`
        }
        return this.engine(slug, envelope)
    },
}
