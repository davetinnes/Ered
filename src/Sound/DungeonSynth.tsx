export class DungeonSynth {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;

  start() {
    if (this.ctx) return; // Already running
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const sequence = [40, 43, 47, 52, 40, 43, 47, 55, 38, 41, 45, 50, 36, 40, 43, 48];
    let step = 0;

    this.intervalId = setInterval(() => {
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle'; 

      const note = sequence[step % sequence.length];
      osc.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime); // Keep it quiet in background
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 1.2);
      
      step++;
    }, 400);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.ctx) this.ctx.close();
    this.ctx = null;
  }
}

export const synth = new DungeonSynth();
export default synth;