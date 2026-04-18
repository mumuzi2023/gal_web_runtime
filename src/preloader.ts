import type { GameData } from "./types";

/** Image preloader — prefetches all game images and caches them in memory. */

const imageCache = new Map<string, HTMLImageElement>();

export function preloadImages(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter((u) => u && u.startsWith("http")))];
  const promises = unique.map(
    (url) =>
      new Promise<void>((resolve) => {
        if (imageCache.has(url)) {
          resolve();
          return;
        }
        const img = new Image();
        img.onload = () => {
          imageCache.set(url, img);
          resolve();
        };
        img.onerror = () => resolve(); // Don't block on errors
        img.src = url;
      })
  );
  return Promise.all(promises).then(() => {});
}

export function getCachedImage(url: string): HTMLImageElement | undefined {
  return imageCache.get(url);
}

export function isImageCached(url: string): boolean {
  return imageCache.has(url);
}

/** Collect all image URLs from GameData for preloading */
export function collectImageUrls(gameData: GameData): string[] {
  const urls: string[] = [];
  const manifest = gameData._asset_manifest || {};

  const resolve = (path: string | undefined): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return manifest[path] || path;
  };

  // Character expressions
  for (const char of Object.values(gameData.characters)) {
    for (const expr of Object.values(char.expressions)) {
      const url = resolve(expr);
      if (url) urls.push(url);
    }
  }

  // Scene backgrounds
  for (const scene of Object.values(gameData.scenes)) {
    if (scene.background) {
      const url = resolve(scene.background);
      if (url) urls.push(url);
    }
    // CG and bg commands
    for (const cmd of scene.commands) {
      if (cmd.type === "bg") {
        const url = resolve(cmd.src);
        if (url) urls.push(url);
      } else if (cmd.type === "cg") {
        const url = resolve(cmd.src);
        if (url) urls.push(url);
      }
    }
  }

  return urls;
}
