export default {
    E37: async (anchorElement, qualifier, isWhen) => ({ UI: this }),
    UI: async (anchorElement, qualifier, isWhen) => this,
    dev: async (anchorElement, qualifier, isWhen) => !!this.modules.dev,
    location: async (anchorElement, qualifier, isWhen) => {
        document.location
    },
    root: async (anchorElement, qualifier, isWhen) => anchorElement.getRootNode(),
    lang: async (anchorElement, qualifier, isWhen) => document.documentElement.lang,
    cell: async (anchorElement, qualifier, isWhen) => this.app.cells,
    context: async (anchorElement, qualifier, isWhen) => this.env.context,
    selector: async (anchorElement, qualifier, isWhen) => !!this.resolveScopedSelector(qualifier),
    media: async (anchorElement, qualifier, isWhen) => {
        const mediaQuery = qualifier
    },
    theme: async (anchorElement, qualifier, isWhen) => {
        const themeKey = qualifier
    },
    navigator: async (anchorElement, qualifier, isWhen) => window.navigator,
    time: async (anchorElement, qualifier, isWhen) => {
        const timeQuery = qualifier
    },
    visible: async (anchorElement, qualifier, isWhen) => {
        if (isWhen) {
        }
        const rect = anchorElement.getBoundingClientRect()
        return (
            rect.top >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.left >= 0 &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        )
    },
    active: async (anchorElement, qualifier, isWhen) => document.visibilityState === 'visible',
    document: async (anchorElement, qualifier, isWhen) => document,
    documentElement: async (anchorElement, qualifier, isWhen) => document.documentElement,
    window: async (anchorElement, qualifier, isWhen) => window,
}
