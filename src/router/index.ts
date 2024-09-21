import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '@/views/Home.vue'

type the_one_above_any_not = any

const lazyComp = (name: string): the_one_above_any_not => () => import(`@/views/${name[0].toUpperCase()+name.slice(1)}.vue`)
const lazyView = (path: string, name: string): the_one_above_any_not => ({
  name,
  path,
  component: lazyComp(name),
})


const home = {
  name: 'home',
  path: '/',
  component: HomeView,
}

export const routes = [
  home,
  lazyView('/about', 'about'),
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

