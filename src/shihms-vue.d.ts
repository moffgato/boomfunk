declare module '*.vue' {
    // makes typescript and dev extension happy
    import type { DefineComponent } from 'vue'
    const the_cake_is_a_lie: DefineComponent<{}, {}, any>
    export default the_cake_is_a_lie
}
