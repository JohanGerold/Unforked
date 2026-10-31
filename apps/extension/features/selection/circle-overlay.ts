import { parseRepoRef, repoKey, type RepoRef } from '@unforked/contracts';
import { resolveSelection, type Point } from './resolve-selection';
export function startCircle() {
  const host = document.createElement('div'); host.id = 'unforked-circle-overlay'; host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `<style>:host{all:initial}svg{position:fixed;inset:0;width:100%;height:100%;cursor:crosshair;touch-action:none;background:#0d111733}polyline{fill:#7ee78718;stroke:#7ee787;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.hint{position:fixed;left:50%;top:20px;transform:translateX(-50%);background:#161b22;color:#f0f3f6;font:14px system-ui;padding:12px 18px;border:1px solid #30363d;border-radius:10px;box-shadow:0 8px 24px #0005;max-width:80vw}button{display:block;background:#212830;color:#f0f3f6;border:1px solid #30363d;border-radius:6px;padding:10px;margin:8px 0;width:100%;font:inherit;cursor:pointer}button:focus-visible{outline:2px solid #7ee787}button:hover{background:#30363d}</style><svg aria-label="Draw around a GitHub repository link"><polyline /></svg><div class="hint" role="status">Circle a repository title or link. Escape to cancel.</div>`;
  document.documentElement.append(host);
  const svg = shadow.querySelector('svg')!; const line = shadow.querySelector('polyline')!; const hint = shadow.querySelector('.hint')!;
  let points: Point[] = []; let drawing = false;
  const cleanup = () => { document.removeEventListener('keydown', onKey, true); window.removeEventListener('scroll', onScroll, true); host.remove(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); cleanup(); } };
  const onScroll = () => { drawing = false; points = []; line.setAttribute('points', ''); hint.textContent = 'The page moved. Draw again, or press Escape to cancel.'; };
  const select = async (repo: RepoRef) => { cleanup(); await chrome.runtime.sendMessage({ type: 'UNFORKED_SELECTED', repo }); };
  svg.addEventListener('pointerdown', e => { drawing = true; points = [{ x: e.clientX, y: e.clientY }]; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
  svg.addEventListener('pointermove', e => { if (!drawing) return; if (points.length < 1500) points.push({ x: e.clientX, y: e.clientY }); line.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' ')); });
  svg.addEventListener('pointerup', () => {
    if (!drawing) return; drawing = false;
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).flatMap(a => { const repo = parseRepoRef(a.href); const rect = a.getBoundingClientRect(); return repo && rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight ? [{ repo, bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } }] : []; });
    const result = resolveSelection(points, links);
    if (result.kind === 'selected') void select(result.repo);
    else if (result.kind === 'ambiguous') { hint.textContent = 'Which repository did you mean?'; result.repos.slice(0, 8).forEach(repo => { const button = document.createElement('button'); button.textContent = repoKey(repo); button.onclick = () => void select(repo); hint.append(button); }); (hint.querySelector('button') as HTMLButtonElement)?.focus(); }
    else hint.textContent = 'No repository link was inside that circle. Try again, or press Escape.';
  });
  document.addEventListener('keydown', onKey, true); window.addEventListener('scroll', onScroll, true);
  return cleanup;
}
