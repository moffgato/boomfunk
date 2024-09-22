<template>
  <div class="group beat-grid flex flex-wrap justify-center items-center mt-4">
    <TransitionGroup name="fade" tag="div" class="flex flex-wrap justify-center items-center transform-gpu">
     <img
       v-show="gridItems.length"
       v-for="(_, index) in gridItems"
       :key="index"
       src="/solana_icon.svg"
       :class="[
         'audio-grid-item w-8 h-8 m-1  transition-margin duration-margin-500 transition-transform transition-color duration-color-500 transition-opacity duration-opacity-500 transition-filter durtation-filter-500 ease hover:hue-rotate-180',

         { 'animate-pulse-scale': pulsingElements.includes(index) || (triggerEvenPulse && index % 2 === 0) },
         { 'animate-no-pulse': !pulsingElements.includes(index) && currentEnergy > 100, },
       ]"
       :style="{
         transform: pulsingElements.includes(index) ? `scale(${currentScale})` : 'scale(1)',
         animationDuration: `${currentDuration}s`
       }"
       alt="Solana Icon"
     />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import 'animate.css'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { EventBus } from '../../lib'

const props = defineProps({
  isPlaying: {
    type: Boolean,
    default: false,
  },
  numOfElements: {
    type: Array<number>,
    default: [12],
  }
});

const gridItems = ref<string[]>(Array.from({ length: props.numOfElements[0] }, (_, i) => (i + 1).toString()))

watch(() => props.numOfElements, (newValue) => {
  gridItems.value = Array.from({ length: newValue[0] }, (_, i) => (i + 1).toString())
})

const isPulsing = ref(false)
// lock to prevent overlapping animations
const isAnimating = ref(false)
const currentColors = ref<string[]>(gridItems.value.map(() => 'bg-orange-300'))
const cumulativeEnergy = ref(0)
const currentEnergy = ref(0.0)
const currentScale = ref(1)
// dynamic duration for smooth animations
const currentDuration = ref(1)
// state to control even pulse animation
const triggerEvenPulse = ref(false)

// elements that are currently pulsing
const pulsingElements = ref<number[]>([])

const maxEnergy = gridItems.value.length
// adds decay of energy
const relaxationFactor = 0.95
// threshold to trigger even element pulse based on energy
const evenPulseThreshold = 4;

watch(() => props.isPlaying, (nextState) => {
  if (!nextState) {
    currentEnergy.value = 0.0
  }
});

// get a random subset of elements to pulse
const getRandomElements = (count: number, total: number) => {
  const indices: number[] = []
  while (indices.length < count) {
    const randomIndex = Math.floor(Math.random() * total)
    if (!indices.includes(randomIndex)) {
      indices.push(randomIndex)
    }
  }
  return indices
}

const triggerPulse = (energy: number) => {

  currentEnergy.value = energy

  // f off and return if animating
  if (isAnimating.value) return

  // start the animation lock
  isAnimating.value = true

  // cum energy
  cumulativeEnergy.value = Math.min(cumulativeEnergy.value + energy * 10, maxEnergy)

  //
  const intensity = Math.min(cumulativeEnergy.value / 20, 2)
  currentScale.value = 1 + intensity * 0.2
  currentDuration.value = 1 - intensity * 0.3

  triggerEvenPulse.value = cumulativeEnergy.value >= evenPulseThreshold;

  const numOfEl = Math.floor(energy >= 2 ? energy : 2)
  pulsingElements.value = getRandomElements(numOfEl, gridItems.value.length)

  isPulsing.value = true
  const colorClasses = [
  'bg-orange-100',
  'bg-orange-200',
  'bg-orange-300',
  'bg-orange-400',
  'bg-orange-500',
  'bg-orange-600',
  'bg-orange-700',
  'bg-orange-800',
  'bg-orange-1000',
  ]

  // applies css classes to animation targets
  pulsingElements.value.forEach((index) => {
    currentColors.value[index] = colorClasses[Math.floor(Math.random() * colorClasses.length)]
  })

  // resets the animation lock
  setTimeout(() => {
    isPulsing.value = false
    // clear the pulsing elements after animation
    pulsingElements.value = []
    currentColors.value = gridItems.value.map(() => 'hue-rotate-15')

    // decay energy
    cumulativeEnergy.value *= relaxationFactor

    if (cumulativeEnergy.value < evenPulseThreshold) {
      triggerEvenPulse.value = false;
    }

    // release animation lock
    isAnimating.value = false
  }, currentDuration.value * 1000) // f off for 1s. not perfect but let's not
}

const onBeat = (data: { energy: number }) => {
  triggerPulse(gridItems.value.length > 100 ? gridItems.value.length * (data.energy / 100) : data.energy)
}

onMounted(() => {
  EventBus.on('beat', onBeat)
})

onBeforeUnmount(() => {
  EventBus.off('beat', onBeat)
})
</script>

<style scoped>
@keyframes pulse-scale {
  0% {
    transform: scale(1);

    opacity: 0.9;
    filter: hue-rotate(0deg);
  }
  25% {
    transform: scale(1.1);

    opacity: 0.75;
    filter: hue-rotate(180deg);
  }
  50% {
    transform: scale(1.5);

    opacity: 0.1;
    filter: hue-rotate(360deg);
  }
  75% {
    transform: scale(1.1);

    opacity: 0.55;
    filter: hue-rotate(180deg);
  }
  100% {
    transform: scale(1);

    opacity: 0.9;
    filter: hue-rotate(0deg);
  }
}

@keyframes pulse-wulse {
  0% {
    filter: hue-rotate(0deg);
  }
  50% {
    filter: hue-rotate(180deg)
  }
  100% {
    filter: hue-rotate(0deg);
  }
}

.animate-pulse-scale {
  animation: pulse-scale .5s ease-in-out, shakeY 1s ease;
}

.animate-no-pulse {
  animation: pulse-wulse 3s, heartBeat .7s ease-in-out infinite;
}

.fade-enter-active {
  transition: opacity 0.6s ease-in-out, transform 0.6s ease-in-out;
}

.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.fade-enter-to {
  opacity: 1;
  transform: scale(1);
}

.fade-leave-from {
  opacity: 1;
}

.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}


</style>

