declare module "soundtouchjs" {
  export class PitchShifter {
    constructor(
      context: BaseAudioContext,
      buffer: AudioBuffer,
      bufferSize?: number,
      onEnd?: () => void
    );
    pitch: number;
    tempo: number;
    percentagePlayed: number;
    connect(toNode: AudioNode): void;
    disconnect(): void;
    on(eventName: string, cb: (detail: { timePlayed: number }) => void): void;
    off(eventName?: string | null): void;
  }
}
