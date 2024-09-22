<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import BeatGrid from './BeatGrid.vue'
import AudioSelect from './Select.vue'
import { EventBus } from '../../lib'
import { fetchAudioBuffer, getAudioContext, closeAudioContext } from '../../lib/utils'
import Meyda from 'meyda'
import debounce from 'lodash.debounce'
import { useToast } from '@/components/ui/toast/use-toast'


const { toast } = useToast()


type MeydaAnalyzer = any
type MeydaFeatures = any


const isPlaying = ref(false)
const isLoading = ref(false)
let audioCtx: AudioContext | null = null
let source: AudioBufferSourceNode | null = null
let analyser: AnalyserNode | null = null

let meydaAnalyzer: MeydaAnalyzer | null = null
let startTime: number = 0
let pauseTime: number = 0
let audioBuffer: AudioBuffer | null = null

const numOfElements = ref([0])

const lastBeat = ref(0)
const currentEnergy = ref(0.0)
const previousEnergy = ref(0.0)
const highestEnergy = ref(0.0)

const errorMessage = ref<string | null>(null)

const mp3Options = ref([
  { label: 'When GM', value: '/when_gm.mp3' },
  { label: 'caravan_place__lone_digger', value: '/caravan_place__lone_digger.mp3' },
  { label: 'True Survivor', value: '/hoff_true_survivor.mp3' },
  { label: 'How Bad', value: '/lorax_how_bad.mp3' },
  { label: 'gramatik_v_nirvana_v_burr_lake_fire', value: '/gramatik_v_nirvana_v_burr_lake_fire.mp3' },
])

const getSongIndex = (label: string): number => {
  const index = mp3Options.value.findIndex((opt: any) => opt.label.toLowerCase().includes(label))
  return index !== -1 ? index : 0
}
const AUDIO_URL = ref(mp3Options.value[getSongIndex('v_burr')].value)
const audioBufferCache = ref<Record<string, AudioBuffer>>({})

const debouncedLoadAudio = debounce(async (newAudioURL: string) => {
  if (!newAudioURL || typeof newAudioURL !== 'string') {
    console.error('Invalid AUDIO_URL:', newAudioURL)
    errorMessage.value = 'Invalid audio selection. Please choose a valid track.'
    toast({
      title: 'Invalid Selection',
      description: 'Please select a valid track from the dropdown.',
      variant: 'destructive',
    })
    return
  }

  const wasPlaying = isPlaying.value

  if (wasPlaying) {
    stopAudio()
    toast({
      title: 'Playback Stopped',
      description: `Stopped playing before switching to a new track.`,
      variant: 'default',
    })
  }

  pauseTime = 0

  await loadAudio(newAudioURL)

  if (wasPlaying) {
    await playAudio()
    toast({
      title: 'Now Playing',
      description: `Switched to "${getCurrentSongLabel()}"`,
      variant: 'default',
    })
  }
}, 300)


watch(AUDIO_URL, (newAudioURL, oldAudioURL) => {
  console.log(`AUDIO_URL changed from ${oldAudioURL} to ${newAudioURL}`)
  debouncedLoadAudio(newAudioURL)
})


const getCurrentSongLabel = (): string => {
  const currentOption = mp3Options.value.find(opt => opt.value === AUDIO_URL.value)
  return currentOption ? currentOption.label : 'Unknown'
}


const loadAudio = async (url: string) => {
  if (!audioCtx) {
    audioCtx = getAudioContext()
    console.log('AudioContext initialized.')
  }

  try {
    console.log(`Loading audio from URL: ${url}`)
    isLoading.value = true

    if (audioBufferCache.value[url]) {
      audioBuffer = audioBufferCache.value[url]
      console.log('Loaded AudioBuffer from cache.')
    } else {
      const fetchedBuffer = await fetchAudioBuffer(audioCtx, url)
      audioBuffer = fetchedBuffer
      audioBufferCache.value[url] = fetchedBuffer
      console.log('AudioBuffer loaded and cached.')
    }

    errorMessage.value = null
  } catch (error) {
    console.error('Error loading audio:', error)
    errorMessage.value = 'Failed to load audio. Please select a different track.'
    toast({
      title: 'Load Error',
      description: 'Failed to load the selected track. Please try another one.',
      variant: 'destructive',
    })
  } finally {
    isLoading.value = false
  }
}


const initMeyda = () => {
  if (!audioCtx || !analyser) return

  meydaAnalyzer = Meyda.createMeydaAnalyzer({
    audioContext: audioCtx,
    source: analyser,
    bufferSize: 512,
    featureExtractors: ['energy'],
    callback: (features: MeydaFeatures) => {
      const currentEnergyValue = features.energy
      if (currentEnergyValue > 0.5 && currentEnergyValue > previousEnergy.value) {

        EventBus.emit('beat', { energy: currentEnergyValue })
      }
      previousEnergy.value = currentEnergyValue
    }
  })

  meydaAnalyzer.start()
  console.log('Meyda Analyzer started.')
}


const handleAudioEnded = () => {
  console.log('Audio playback ended.')

  isPlaying.value = false

  pauseTime = 0

  // clear elements
  numOfElements.value = [0]

  if (meydaAnalyzer) {
    meydaAnalyzer.stop()
    meydaAnalyzer = null
  }

  if (analyser) {
    analyser.disconnect()
    analyser = null
  }

  if (source) {
    source.disconnect()
    source = null
  }

  currentEnergy.value = 0.0
  highestEnergy.value = 0.0

  toast({
    title: 'Playback Finished',
    description: `"${getCurrentSongLabel()}" has finished playing.`,
    variant: 'default',
  })

  console.log('Playback state has been reset.')
}

const playAudio = async () => {
  if (!audioCtx) {
    audioCtx = getAudioContext()
    console.log('AudioContext initialized.')
  }

  try {
    if (source) {
      stopAudio()
    }

    if (!audioBuffer) {
      console.error('No audio buffer loaded. Cannot play audio.')
      errorMessage.value = 'No audio loaded. Please select a track.'
      toast({
        title: 'Playback Error',
        description: 'No audio loaded to play.',
        variant: 'destructive',
      })
      return
    }


    source = audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.loop = false


    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048


    source.connect(analyser)
    analyser.connect(audioCtx.destination)

    source.onended = handleAudioEnded


    source.start(0, pauseTime)
    startTime = audioCtx.currentTime - pauseTime
    console.log('Audio playback started.')


    initMeyda()


    toast({
      title: 'Playback Started',
      description: `Now playing "${getCurrentSongLabel()}".`,
      variant: 'default',
    })

  } catch (error) {
    console.error('Failed to play audio or detect beats:', error)
    errorMessage.value = 'Failed to play audio. Please try again.'
    toast({
      title: 'Playback Error',
      description: 'An error occurred during playback.',
      variant: 'destructive',
    })
  }
}


const stopAudio = () => {
  if (source) {
    try {
      source.stop()
      console.log('Audio source stopped.')
    } catch (e) {
      console.warn('Source already stopped or cannot be stopped:', e)
    }
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
    console.log('Meyda Analyzer stopped.')
  }

  if (audioCtx && audioCtx.state === 'running') {
    pauseTime = audioCtx.currentTime - startTime
    audioCtx.suspend().then(() => {
      console.log('AudioContext suspended.')
    }).catch((error) => {
      console.error('Error suspending AudioContext:', error)
    })
  }


  toast({
    title: 'Playback Paused',
    description: `Paused "${getCurrentSongLabel()}".`,
    variant: 'default',
  })
}


const togglePlay = async () => {
  try {
    if (isPlaying.value) {

      stopAudio()
      isPlaying.value = false
      console.log('Playback paused.')
    } else {

      if (audioCtx && audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume()
          console.log('AudioContext resumed.')
        } catch (error) {
          console.error('Error resuming AudioContext:', error)
          errorMessage.value = 'Failed to resume audio context.'
          toast({
            title: 'Audio Context Error',
            description: 'Failed to resume audio context.',
            variant: 'destructive',
          })
          return
        }
      }


      await playAudio()
      isPlaying.value = true
      console.log('Playback started.')
    }
  } catch (error) {
    console.error('Error toggling playback:', error)
    errorMessage.value = 'An error occurred while toggling playback.'
    toast({
      title: 'Toggle Error',
      description: 'An error occurred while toggling playback.',
      variant: 'destructive',
    })
  }
}


const resetAudio = async () => {
  try {
    const wasPlaying = isPlaying.value

    stopAudio()

    pauseTime = 0

    await loadAudio(AUDIO_URL.value)

    if (wasPlaying) {
      await playAudio()
      isPlaying.value = true
      toast({
        title: 'Playback Reset',
        description: `Restarted "${getCurrentSongLabel()}".`,
        variant: 'default',
      })
    } else {
      toast({
        title: 'Playback Reset',
        description: `"${getCurrentSongLabel()}" is reset to the beginning.`,
        variant: 'default',
      })
    }

    console.log('Playback reset to the beginning.')
  } catch (error) {
    console.error('Error resetting playback:', error)
    errorMessage.value = 'An error occurred while resetting playback.'
    toast({
      title: 'Reset Error',
      description: 'An error occurred while resetting playback.',
      variant: 'destructive',
    })
  }
}


onBeforeUnmount(async () => {
  stopAudio()
  stopIntervals()
  await closeAudioContext()
})


let removeInterval: any = null
let addInterval: any = null


const stopIntervals = () => {
  if (removeInterval) {
    clearInterval(removeInterval)
    removeInterval = null
  }
  if (addInterval) {
    clearInterval(addInterval)
    addInterval = null
  }
}


const removeElements = () => {
  stopIntervals()

  stopAudio()
  isPlaying.value = false

  removeInterval = setInterval(() => {
    if (numOfElements.value[0] > 0) {
      numOfElements.value = [numOfElements.value[0] - 4]
    } else {
      clearInterval(removeInterval)
      toast({
        title: 'Visuals Cleared',
        description: 'All visual elements have been removed.',
        variant: 'default',
      })
    }
  }, 10)
}


const handleDeadBeat = () => {
  const lastBeatValue = lastBeat.value || 0
  const timeSinceLastBeat = Date.now() - lastBeatValue

  if (timeSinceLastBeat >= 3500) {
    if (isPlaying.value) {
      removeElements()
    }
  }
}


watch(lastBeat, (newValue) => {
  if (!newValue) return

  setTimeout(() => {
    handleDeadBeat()
  }, 1500)
})


watch(isPlaying, (nextState) => {
  stopIntervals()

  if (!nextState) {
    removeElements()
  }

  if (nextState) {
    addInterval = setInterval(() => {
      if (numOfElements.value[0] < 768) {
        numOfElements.value = [numOfElements.value[0] + 4]
      } else {
        clearInterval(addInterval)
      }
    }, 10)
  }
})


onMounted(async () => {
  if (AUDIO_URL.value) {
    await loadAudio(AUDIO_URL.value)
  } else {
    errorMessage.value = 'No audio selected.'
    toast({
      title: 'No Audio',
      description: 'Please select an audio track to begin.',
      variant: 'destructive',
    })
  }

  EventBus.on('beat', (beat) => {
    currentEnergy.value = beat?.energy || 0
    if (highestEnergy.value < currentEnergy.value) {
      highestEnergy.value = beat.energy
    }
    lastBeat.value = Date.now()
  })
})


onBeforeUnmount(() => {
  EventBus.off('beat')
  stopIntervals()
})
</script>

<template>
  <div class="player">
    <div class="flex">
      <div class="flex flex-col justify-center w-full w-[300px] gap-0">
        <div class="flex justify-center gap-1">
          <AudioSelect
            v-model="AUDIO_URL"
            :audioOptions="mp3Options"
          />
          <div class="flex justify-center sounding-butts gap-1">
            <Button
              variant="outline"
              class="text-white px-4 py-2 rounded mb-4"
              @click="togglePlay"
              aria-label="Play or Pause Audio"
            >
              {{ isPlaying ? "Pause" : "Play" }}
            </Button>
            <Button
              variant="outline"
              class="text-white px-4 py-2 rounded mb-4"
              @click="resetAudio"
              aria-label="Reset Audio"
            >
              Reset
            </Button>
          </div>
        </div>

        <Separator class="animate-fade-in duration-200" v-show='currentEnergy > 0 || highestEnergy > 0' />

        <div class="flex justify-center gap-2 animate-fade-in" v-show="currentEnergy > 0 || highestEnergy > 0">
          <code class="w-full text-slate-500 p-1 select-none flex flex-nowrap justify-center">
            {{ `${highestEnergy.toFixed(8)}` }}
          </code>
          <Separator orientation="vertical" />
          <code class="w-full text-slate-500 p-1 select-none flex flex-nowrap justify-center">
            {{ `${currentEnergy.toFixed(8)}` }}
          </code>
        </div>

        <Separator class="animate-fade-in" v-show='currentEnergy > 0 || highestEnergy > 0' />

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="isLoading" class="loading-spinner">
        </div>

      </div>
    </div>
    <BeatGrid :isPlaying="isPlaying" :numOfElements="numOfElements" />
  </div>
</template>

<style scoped>
.player {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.error-message {
  color: red;
  margin-top: 1rem;
  text-align: center;
}

.loading-spinner {
  color: white;
  font-size: 1rem;
  margin-top: 1rem;
}

.animate-fade-in {
  animation: fadeInUp .35s ease;
}
</style>

