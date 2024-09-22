import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


let audioContextInstance: AudioContext | null = null

export const getAudioContext = (): AudioContext => {
  if (!audioContextInstance) {
    audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)()
    console.log('AudioContext created.')
  }
  return audioContextInstance
}

export const closeAudioContext = async () => {
  if (audioContextInstance) {
    try {
      await audioContextInstance.close()
      console.log('AudioContext closed.')
      audioContextInstance = null
    } catch (error) {
      console.error('Error closing AudioContext:', error)
    }
  }
}

export const fetchAudioBuffer = async (audioCtx: AudioContext, url: string): Promise<AudioBuffer> => {
  try {
    const response = await fetch(url)
    console.log(`Fetching audio from: ${url}`, response)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    console.log('ArrayBuffer fetched successfully:', arrayBuffer)
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    console.log('AudioBuffer decoded successfully:', audioBuffer)
    return audioBuffer

  } catch (error) {
    console.error('Error fetching or decoding audio data:', error)
    throw error
  }
}


