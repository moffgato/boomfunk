import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { createPinia } from 'pinia'
import { PiniaLogger } from 'pinia-logger'

import '@/assets/app.css'

const store = createPinia()

store.use(PiniaLogger({
  expanded: true,
  disabled: import.meta.env.mode === "production",
}))

const app = createApp(App)

app
  .use(store)
  .use(router)
  .mount('#app')

