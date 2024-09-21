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
    <div class="flex gap-2 items-baseline">


    <Button
       variant="outline"
       class="text-white px-4 py-2 rounded hover:bg-red-600 mb-4"
       @click="togglePlay"
       aria-label="Play or Pause Audio"
     >
      {{ isPlaying ? "Pause" : "Play" }}
    </Button>

    </div>
    <BeatGrid :isPlaying='isPlaying' :numOfElements="numOfElements" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Slider } from '../ui/slider'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import BeatGrid from './BeatGrid.vue'
import AudioSelect from './Select.vue'
import { EventBus } from '../../lib'
import { fetchAudioBuffer } from '../../lib/utils'
import Meyda from 'meyda'


const isPlaying = ref(false)
let audioCtx: AudioContext | null = null
let source: AudioBufferSourceNode | null = null
let analyser: AnalyserNode | null = null
let meydaAnalyzer: Meyda.MeydaAnalyzer | null = null;
let startTime: number = 0
let pauseTime: number = 0
let audioBuffer: AudioBuffer | null = null

let numOfElements = ref([0])



// const AUDIO_URL = ref('/hiroyuki_sawano_attack_on_titan_suite.mp3')
const mp3Options = ref([
  { label: 'sistar_so_cool', value: '/sistar_so_cool.mp3' },
  { label: 'When GM', value: '/when_gm.mp3', },
  { label: 'attack_on_titan', value: '/hiroyuki_sawano_attack_on_titan_suite.mp3', },
  { label: 'caravan_place__lone_digger', value: '/caravan_place__lone_digger.mp3' },
  { label: 'True Survivor', value: '/hoff_true_survivor.mp3' },
  { label: 'How Bad', value: '/lorax_how_bad.mp3' },
])

const AUDIO_URL = ref(mp3Options.value[3].value)

watch(() => AUDIO_URL.value, async (newAudioURL) => {
  console.log({ newAudioURL })
  await loadAudio()
});

const MAX_ELEMENT_COUNT = 1024

watch(() => isPlaying.value, (nextState) => {

  if (!isPlaying.value && numOfElements.value[0] > 4) {
       numOfElements.value = [numOfElements.value[0] - 4]
  }

  const timeout = setInterval(() => {

    if (isPlaying.value && numOfElements.value[0] < MAX_ELEMENT_COUNT) {
      numOfElements.value = [numOfElements.value[0] + 4]
    } else if (!isPlaying.value && numOfElements.value[0] > 4) {
      numOfElements.value = [numOfElements.value[0] - 4]
    } else if (numOfElements.value >= MAX_ELEMENT_COUNT) {
      clearTimeout(timeout)
    }

  }, 10);


})

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
    callback: (features: Meyda.Features) => {
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
    // https://developer.chrome.com/blog/autoplay/#webaudio
    if (audioCtx && audioCtx.state === 'running') {
      await audioCtx.suspend()
    }
  } else {
    // Resume AudioContext if suspended
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

