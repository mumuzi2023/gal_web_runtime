import type { SceneDef } from "./types";

/** Translate the editor's source index once, for both passive execution and seeking. */
export function studioCommandTarget(scene: SceneDef | undefined, requested: number): number {
  const sourceIndex = Number.isFinite(requested) ? Math.max(0, requested) : 0;
  const indices = scene?._studio_command_indices;
  if (!indices?.length) return sourceIndex;
  let target = 0;
  for (let index = 0; index < indices.length; index++) {
    if (indices[index] > sourceIndex) break;
    target = index;
  }
  return target;
}
