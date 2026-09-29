/** A command timer whose remaining duration survives navigation overlays. */
export class PlaybackTimer {
  private handle: ReturnType<typeof setTimeout> | undefined;
  private remaining = 0;
  private started = 0;
  private callback: (() => void) | undefined;

  schedule(duration: number, callback: () => void) {
    this.cancel();
    this.remaining = duration;
    this.callback = callback;
    this.resume();
  }

  pause() {
    if (this.handle === undefined) return;
    clearTimeout(this.handle);
    this.handle = undefined;
    this.remaining = Math.max(0, this.remaining - (performance.now() - this.started));
  }

  resume() {
    if (!this.callback || this.handle !== undefined) return;
    this.started = performance.now();
    this.handle = setTimeout(() => {
      const callback = this.callback;
      this.cancel();
      callback?.();
    }, this.remaining);
  }

  cancel() {
    clearTimeout(this.handle);
    this.handle = undefined;
    this.callback = undefined;
    this.remaining = 0;
  }
}
