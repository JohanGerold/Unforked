import { repoKey, type RepoRef } from '@unforked/contracts';
export interface Point { x: number; y: number }
export interface LinkCandidate { repo: RepoRef; bounds: { left: number; top: number; right: number; bottom: number } }
export type SelectionResult = { kind: 'selected'; repo: RepoRef } | { kind: 'ambiguous'; repos: RepoRef[] } | { kind: 'none' };
function inside(point: Point, polygon: Point[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
export function resolveSelection(points: Point[], links: LinkCandidate[]): SelectionResult {
  if (points.length < 3) return { kind: 'none' };
  const width = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
  const height = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
  if (width < 10 || height < 10) return { kind: 'none' };
  const repos = new Map<string, RepoRef>();
  for (const link of links) {
    const b = link.bounds;
    if (inside({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 }, points)) repos.set(repoKey(link.repo), link.repo);
  }
  const candidates = [...repos.values()];
  return candidates.length === 1 ? { kind: 'selected', repo: candidates[0] } : candidates.length ? { kind: 'ambiguous', repos: candidates } : { kind: 'none' };
}
