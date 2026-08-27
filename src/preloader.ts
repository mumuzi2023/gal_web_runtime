import type { Command, GameData } from "./types";
import { resolveAssetUrl } from "./assets";

/**
 * Browser asset cache.
 *
 * Relative URLs are intentionally supported: standalone exports rewrite the
 * manifest to `assets/...`, so filtering to HTTP would disable preloading for
 * the exact build that needs it most.
 */
const imageCache = new Map<string, HTMLImageElement>();
const audioCache = new Map<string, HTMLAudioElement>();
const failedAssets = new Set<string>();

export interface PreloadReport {
  total: number;
  loaded: number;
  failed: string[];
}

type ProgressCallback = (completed: number, total: number, url: string) => void;

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls.map((url) => url?.trim()).filter(Boolean))];
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(fallback), timeoutMs);
    promise.then((value) => {
      window.clearTimeout(timeout);
      resolve(value);
    });
  });
}

export async function preloadImages(
  urls: string[],
  onProgress?: ProgressCallback,
): Promise<PreloadReport> {
  const targets = uniqueUrls(urls);
  let completed = 0;
  const failed: string[] = [];

  await Promise.all(targets.map(async (url) => {
    if (imageCache.has(url)) {
      completed += 1;
      onProgress?.(completed, targets.length, url);
      return;
    }
    const ok = await withTimeout(new Promise<boolean>((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        imageCache.set(url, image);
        failedAssets.delete(url);
        resolve(true);
      };
      image.onerror = () => resolve(false);
      image.src = url;
    }), 10_000, false);
    if (!ok) {
      failed.push(url);
      failedAssets.add(url);
    }
    completed += 1;
    onProgress?.(completed, targets.length, url);
  }));

  return { total: targets.length, loaded: targets.length - failed.length, failed };
}

export async function preloadAudio(
  urls: string[],
  onProgress?: ProgressCallback,
): Promise<PreloadReport> {
  const targets = uniqueUrls(urls);
  let completed = 0;
  const failed: string[] = [];

  await Promise.all(targets.map(async (url) => {
    if (audioCache.has(url)) {
      completed += 1;
      onProgress?.(completed, targets.length, url);
      return;
    }
    const ok = await withTimeout(new Promise<boolean>((resolve) => {
      const audio = new Audio();
      const cleanup = () => {
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("loadeddata", onReady);
        audio.removeEventListener("error", onError);
      };
      const onReady = () => {
        cleanup();
        audioCache.set(url, audio);
        failedAssets.delete(url);
        resolve(true);
      };
      const onError = () => {
        cleanup();
        resolve(false);
      };
      audio.preload = "auto";
      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener("loadeddata", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.src = url;
      audio.load();
    }), 8_000, false);
    if (!ok) {
      failed.push(url);
      failedAssets.add(url);
    }
    completed += 1;
    onProgress?.(completed, targets.length, url);
  }));

  return { total: targets.length, loaded: targets.length - failed.length, failed };
}

export function getFailedAssets(): string[] {
  return [...failedAssets];
}

function resolveAsset(path: string | undefined, gameData: GameData): string {
  return resolveAssetUrl(path, gameData._asset_manifest);
}

function visitCommands(commands: Command[], visitor: (cmd: Command) => void): void {
  for (const command of commands) {
    visitor(command);
    if (command.type === "if") {
      const thenCommands = Array.isArray(command.then) ? command.then : [command.then];
      visitCommands(thenCommands, visitor);
      if (command.else) {
        const elseCommands = Array.isArray(command.else) ? command.else : [command.else];
        visitCommands(elseCommands, visitor);
      }
    }
  }
}

export function collectSceneImageUrls(gameData: GameData, sceneKey: string): string[] {
  const scene = gameData.scenes[sceneKey];
  if (!scene) return [];
  const urls = [resolveAsset(scene.background, gameData)];
  visitCommands(scene.commands, (command) => {
    if (command.type === "bg" || command.type === "cg") {
      urls.push(resolveAsset(command.src, gameData));
    } else if (command.type === "show") {
      const character = gameData.characters[command.character];
      if (!character) return;
      const outfit = character.outfits?.[command.outfit_id || character.default_outfit || "default"];
      const expressions = outfit?.expressions || character.expressions;
      urls.push(resolveAsset(
        expressions[command.expression || "normal"] || expressions.normal || Object.values(expressions)[0],
        gameData,
      ));
    }
  });
  return uniqueUrls(urls);
}

export function collectSceneAudioUrls(gameData: GameData, sceneKey: string): string[] {
  const scene = gameData.scenes[sceneKey];
  if (!scene) return [];
  const urls = [resolveAsset(scene.bgm, gameData)];
  visitCommands(scene.commands, (command) => {
    if (command.type === "bgm" || command.type === "se") {
      urls.push(resolveAsset(command.src, gameData));
    } else if (command.type === "dialog" || command.type === "narration") {
      urls.push(resolveAsset(command.voice, gameData));
    }
  });
  return uniqueUrls(urls);
}

export function collectImageUrls(gameData: GameData): string[] {
  const urls: string[] = [];
  for (const character of Object.values(gameData.characters)) {
    const outfits = character.outfits ? Object.values(character.outfits) : [];
    const expressionSets = outfits.length ? outfits.map((outfit) => outfit.expressions) : [character.expressions];
    for (const expressions of expressionSets) {
      for (const path of Object.values(expressions)) urls.push(resolveAsset(path, gameData));
    }
  }
  for (const sceneKey of Object.keys(gameData.scenes)) {
    urls.push(...collectSceneImageUrls(gameData, sceneKey));
  }
  return uniqueUrls(urls);
}

export function getStartSceneKey(gameData: GameData): string {
  if (gameData.start_scene && gameData.scenes[gameData.start_scene]) return gameData.start_scene;
  const ordered = gameData.scene_order?.find((key) => gameData.scenes[key]);
  return ordered || Object.keys(gameData.scenes)[0] || "";
}

export function getConnectedSceneKeys(gameData: GameData, sceneKey: string): string[] {
  const scene = gameData.scenes[sceneKey];
  if (!scene) return [];
  const keys: string[] = [];
  visitCommands(scene.commands, (command) => {
    if (command.type === "jump") keys.push(command.target);
    if (command.type === "choice") {
      for (const option of command.options) if (option.jump) keys.push(option.jump);
    }
  });
  if (!gameData.explicit_flow && keys.length === 0 && gameData.scene_order) {
    const index = gameData.scene_order.indexOf(sceneKey);
    if (index >= 0 && gameData.scene_order[index + 1]) keys.push(gameData.scene_order[index + 1]);
  }
  return uniqueUrls(keys).filter((key) => Boolean(gameData.scenes[key]));
}

export async function preloadStartupAssets(
  gameData: GameData,
  onProgress?: ProgressCallback,
): Promise<PreloadReport> {
  const startScene = getStartSceneKey(gameData);
  const images = collectSceneImageUrls(gameData, startScene);
  // Audio can be very large. Warm the scene BGM and first spoken line only;
  // remaining lines are progressively loaded while the player reads.
  const audio = collectSceneAudioUrls(gameData, startScene).slice(0, 2);
  const total = images.length + audio.length;
  let completed = 0;
  const relay = (_done: number, _total: number, url: string) => {
    completed += 1;
    onProgress?.(completed, total, url);
  };
  const [imageReport, audioReport] = await Promise.all([
    preloadImages(images, relay),
    preloadAudio(audio, relay),
  ]);
  return {
    total,
    loaded: imageReport.loaded + audioReport.loaded,
    failed: [...imageReport.failed, ...audioReport.failed],
  };
}

export function preloadSceneAssets(gameData: GameData, sceneKey: string): void {
  void preloadImages(collectSceneImageUrls(gameData, sceneKey));
  void preloadAudio(collectSceneAudioUrls(gameData, sceneKey));
}

export function preloadConnectedScenes(gameData: GameData, currentSceneKey: string): void {
  for (const sceneKey of getConnectedSceneKeys(gameData, currentSceneKey)) {
    preloadSceneAssets(gameData, sceneKey);
  }
}
