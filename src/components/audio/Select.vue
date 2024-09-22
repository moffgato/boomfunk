<script setup lang="ts">
import { watch, ref } from 'vue';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from '@/components/ui/select';

// Define props
type AudioOption = {
  label: string;
  value: string;
};

const props = defineProps({
  audioOptions: {
    type: Array as () => AudioOption[],
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

// Internal value to work with v-model
const internalValue = ref(props.modelValue);

// Watch internalValue and emit changes
watch(internalValue, (newVal) => {
  emit('update:modelValue', newVal);
  console.log({ changedAudioUrl: newVal });
});

// Watch prop changes and update internalValue
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== internalValue.value) {
      internalValue.value = newVal;
    }
  }
);
</script>



<template>
  <!-- Custom Select component -->
  <Select v-model='internalValue'>
    <SelectTrigger class="w-[180px]">
      <!-- Display the currently selected value in the trigger -->
      <SelectValue :value="modelValue" placeholder="Select a song" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Songs</SelectLabel>
        <!-- Render available audio options and pass value to handleChange -->
        <SelectItem
          v-for="(option, index) in audioOptions"
          :key="index"
          :value="option.value"
          class="select-none"
        >
          {{ option.label }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>

