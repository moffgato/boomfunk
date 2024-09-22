<script setup lang="ts">
import { routes } from '@/router'
import Button from '../ui/button/Button.vue'
</script>

<template lang="pug">
.app-menu.py-2.flex.justify-center.gap-2
  router-link(v-for='(r, i) in routes', :to="!!r?.name ? { 'name': r.name } : { 'path': r.path }")
    Button(variant='outline' :key='r.name+i') {{ r.name[0].toUpperCase() + r.name.slice(1) }}

</template>
