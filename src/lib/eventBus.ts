import mitt from 'mitt'



export type Events = {
  beat: { energy: number },
}

export const EventBus = mitt<Events>()

// EventBus.on('beat', () => { console.log(new Date(), 'beat detected') })
