<script setup lang="ts">
import {Toaster} from 'vue-sonner'
import { useColorMode } from '@vueuse/core'
import AppMenu from '@/components/menu/AppMenu.vue';

const theme = useColorMode()
theme.value = 'dark'

</script>
<!--

.flex.w-full.justify-center.mb-4
app-menu

-->

<template lang="pug">
.pb-4
  main.px-3
    router-view(v-slot='{ Component }')
      transition(name='fade' mode='out-in')
        keep-alive
          div(:key='$route.path')
            component(:is='Component')

  Toaster(position='bottom-right' :theme='theme' closeButton)

</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>

