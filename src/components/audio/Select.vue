<script setup lang="ts">
import { watch } from 'vue'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'


type audioOption = {
  label: string,
  value: string,
}


const props = defineProps({
  audioOptions: {
    type: Array<audioOption>,
    default: () => []
  },
  modelValue: {
    type: String,
    default: ''
  }
})


const emit = defineEmits(['update:modelValue'])

const handleChange = (value: string) => {
  console.log({ changedAudioUrl: value })
  emit('update:modelValue', value)
}
watch(() => props.modelValue, (newValue, oldValue) => {
  console.log({ newValue, oldValue })
});

</script>

<template>
  <Select @valuechange="handleChange">
    <SelectTrigger class="w-[180px]">
      <SelectValue placeholder="Select a song" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Songs</SelectLabel>
        <SelectItem
          v-for="(option, index) in audioOptions"
          :key="index"
          :value="option.value"
        >
          {{ option.label }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>

