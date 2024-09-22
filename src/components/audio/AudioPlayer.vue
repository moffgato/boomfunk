<!--

  who needs controls anyways?

  <AudioSelect
:modelValue="AUDIO_URL.value"
:audioOptions='mp3Options'
@update:modelValue="() => { console.log('mf') }"
/>

<div class="w-[50vw] flex gap-2">
<Label>{{ numOfElements[0] }}</Label>
<Slider v-model='numOfElements' :default-value='[4]' :min='4' :max="MAX_ELEMENT_COUNT" :step="4" />
</div>

-->

<template>
  <div class="player">
    <div class="flex">

    <div class="flex flex-col justify-center w-full w-[300px] gap-0">

      <div class="flex justify-center sounding-butts">
        <Button
          variant="outline"
          class="text-white px-4 py-2 rounded mb-4"
          @click="togglePlay"
          aria-label="Play or Pause Audio"
          >
          {{ isPlaying ? "Pause" : "Play" }}
        </Button>
      </div>

      <Separator />

      <div class="flex justify-center gap-2">
        <code class="text-slate-500 p-1 select-none flex flex-nowrap">{{ `${highestEnergy.toFixed(8)}` }}</code>
        <Separator orientation="vertical" />
        <code class="text-slate-500 p-1 select-none flex flex-nowrap">{{ `${currentEnergy.toFixed(8)}` }}</code>
      </div>

      <Separator />

    </div>

    </div>
    <BeatGrid :isPlaying='isPlaying' :numOfElements="numOfElements" />
  </div>
</template>




<script setup lang="ts">

/*

  script manages audio, loads it, play/pause etc
  we emit an event for 'beat' so BeatGrid.vue can trigger on it.
  works totally flawlessy, the DOM loves being dominated.

  we also control the amount of elements in the BeatGrid from this component.

  the animation has some minor logic around energy and intensity.
  essentially on beat we animated a % of the elements relative to energy.
  at certain cumulative energy we slam animation on the rest of the elements to create a background(?) feel.

  */


import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import BeatGrid from './BeatGrid.vue'
import { EventBus } from '../../lib'
import { fetchAudioBuffer } from '../../lib/utils'
import Meyda from 'meyda'

// jesus will get you in the end.
type MeydaAnalyzer = any
type MeydaFeatures = any


let isPlaying = ref(false)
let audioCtx: AudioContext | null = null
let source: AudioBufferSourceNode | null = null
let analyser: AnalyserNode | null = null

let meydaAnalyzer: MeydaAnalyzer | null = null;
let startTime: number = 0
let pauseTime: number = 0
let audioBuffer: AudioBuffer | null = null

let numOfElements = ref([0])

let lastBeat = ref(0)
let currentEnergy = ref(0.0)
let highestEnergy = ref(0.0)

const mp3Options = ref([
  { label: 'When GM', value: '/when_gm.mp3', },
//  { label: 'attack_on_titan', value: '/hiroyuki_sawano_attack_on_titan_suite.mp3', },
  { label: 'caravan_place__lone_digger', value: '/caravan_place__lone_digger.mp3' },
  { label: 'True Survivor', value: '/hoff_true_survivor.mp3' },
  { label: 'How Bad', value: '/lorax_how_bad.mp3' },
  { label: 'gramatik_v_nirvana_v_burr_lake_fire', value: '/gramatik_v_nirvana_v_burr_lake_fire.mp3' },
])

const getSongIndex = (label: string) => mp3Options.value.findIndex((opt: any) => opt?.label.toLowerCase().includes(label) || 0)
const AUDIO_URL = ref(mp3Options.value[getSongIndex('cara')].value)

watch(() => AUDIO_URL.value, async (newAudioURL) => {
  console.log({ newAudioURL })
  await loadAudio()
});

const MAX_ELEMENT_COUNT = 768

const meydaConfig = {
  bufferSize: 512,
  featureExtractors: ['energy']
}

const energyThreshold = ref(0.5)
const previousEnergy = ref(0)


const loadAudio = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  if (!audioBuffer) {
    try {
      audioBuffer = await fetchAudioBuffer(audioCtx, AUDIO_URL.value)
    } catch (error) {
      console.error('Error loading audio:', error)
    }
  }
}


const initMeyda = () => {
  if (!audioCtx || !analyser) return

  meydaAnalyzer = Meyda.createMeydaAnalyzer({
    audioContext: audioCtx,
    source: analyser,
    bufferSize: meydaConfig.bufferSize,
    featureExtractors: meydaConfig.featureExtractors,
    callback: (features: MeydaFeatures) => {
      const currentEnergy = features.energy
      if (currentEnergy > energyThreshold.value && currentEnergy > previousEnergy.value) {
        // emit the beat event with energy data, win life
        EventBus.emit('beat', { energy: currentEnergy })
      }
      previousEnergy.value = currentEnergy
    }
  })

  meydaAnalyzer.start()
}

const playAudio = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  try {
    // decode audio
    await loadAudio()

    // create buffer
    source = audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.loop = false

    // creates AnalyserNode
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048

    // connect the nodes. it's a thing
    source.connect(analyser)
    analyser.connect(audioCtx.destination)

    // start playback
    source.start(0, pauseTime)
    startTime = audioCtx.currentTime - pauseTime

    initMeyda()

  } catch (error) {
    console.error('Failed to play audio or detect beats:', error)
  }
}

const stopAudio = () => {

  if (source) {
    source.stop()
    source.disconnect()
    source = null
  }

  if (analyser) {
    analyser.disconnect()
    analyser = null
  }

  if (meydaAnalyzer) {
    meydaAnalyzer.stop()
    meydaAnalyzer = null
  }

  if (audioCtx && audioCtx.state === 'running') {
    pauseTime = audioCtx.currentTime - startTime
  }
}


const togglePlay = async () => {
  if (isPlaying.value) {
    stopAudio()
    isPlaying.value = false
    // suspend AudioContext to comply with browser policies
    // meme/docs:
    // https://developer.chrome.com/blog/autoplay/#webaudio
    if (audioCtx && audioCtx.state === 'running') {
      await audioCtx.suspend()
    }
  } else {
    // resume AudioContext if suspended
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume()
    }
    await playAudio()
    isPlaying.value = true
  }
}

// cleanup
onBeforeUnmount(() => {
  stopAudio()
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
})


let removeInterval: any = null;
let addInterval: any = null;

// Function to stop element removal/addition intervals
const stopIntervals = () => {
  if (removeInterval) {
    clearInterval(removeInterval);
    removeInterval = null;
  }
  if (addInterval) {
    clearInterval(addInterval);
    addInterval = null;
  }
};


const removeElements = () => {
  stopIntervals(); // Stop any other intervals

  stopAudio()
  isPlaying.value = false
  // Start a removal interval
  removeInterval = setInterval(() => {
    if (numOfElements.value[0] > 0) {
      numOfElements.value = [numOfElements.value[0] - 4]; // Decrease elements
    } else {
      clearInterval(removeInterval); // Stop when count reaches 0
    }
  }, 10); // Throttle removal every 10ms
};

// don't be offended
const handleDeadBeat = () => {

  const lastBeatValue = !!lastBeat?.value ? lastBeat.value : 0
  const timeSinceLastBeat = Date.now() - lastBeatValue

  if (timeSinceLastBeat >= 1500) { // 1.5 seconds of inactivity
    if (isPlaying.value) {
      removeElements(); // Start removing elements if no beat for 1.5s
    }
  }
};

// Watch for `lastBeat` changes to determine when to start removing elements
watch(lastBeat, (newValue) => {
  if (!newValue) return;

  // Check if the beat is dead after 1.5 seconds
  setTimeout(() => {
    handleDeadBeat();
  }, 1500);
});

// Watch for changes in `isPlaying` and adjust element count accordingly
watch(isPlaying, (nextState) => {
  stopIntervals(); // Clear any ongoing intervals

  if (!nextState) {
    removeElements(); // Start removing elements when `isPlaying` becomes false
  }

  if (nextState) {
    // Add elements back if isPlaying becomes true
    addInterval = setInterval(() => {
      if (numOfElements.value[0] < MAX_ELEMENT_COUNT) {
        numOfElements.value = [numOfElements.value[0] + 4]; // Add 4 elements at a time
      } else {
        clearInterval(addInterval); // Stop adding when max element count is reached
      }
    }, 10); // Throttle addition every 10ms
  }
});


onMounted(() => {
  EventBus.on('beat', beat => {
//    console.log('audioPlayer beat event detected:', beat);
    currentEnergy.value = beat?.energy
    if (highestEnergy.value < currentEnergy.value) {
      highestEnergy.value = beat.energy
    }
    lastBeat.value = Date.now();
  });
});

onBeforeUnmount(() => {
  EventBus.off('beat');
  stopIntervals();
});



</script>

<style scoped>
.player {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
</style>

