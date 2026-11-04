const pcaControls = document.querySelector('.pca-controls');
const pcaFilters = [...document.querySelectorAll('.pca-controls [data-domain]')];
const pcaCache = new Map();
let projection = 'conditioning';
let projectionRequest = 0;

function filterProjection() {
  for (const svg of document.querySelectorAll('.pca-canvas>svg')) {
    pcaFilters.forEach(input => { svg.dataset[input.dataset.domain] = input.checked ? 'on' : 'off'; });
  }
  const relevant = pcaFilters.filter(input => projection === 'action' || input.dataset.domain !== 'human2');
  document.querySelector('#pca-status').textContent = relevant.every(input => !input.checked) ? 'Select a domain to show its points.' : '';
}

async function setProjection(value) {
  projection = value;
  const request = ++projectionRequest;
  const isAction = value === 'action';
  const names = isAction ? ['tokenizer_regression_off', 'tokenizer_regression_on'] : ['cog_A', 'cog_AB'];
  document.querySelector('#human2-filter').hidden = !isAction;
  document.querySelector('#human-domain-label').textContent = isAction ? 'Human I' : 'Human';
  document.querySelector('#pca-left-title').textContent = isAction ? 'Without latent regularization' : 'Hand geometry alignment only';
  document.querySelector('#pca-right-title').textContent = isAction ? 'With latent regularization' : 'H2RB';
  document.querySelector('#pca-description').textContent = isAction ? 'Cross-domain regularization brings human and robot action latents closer. The normalized human–robot gap decreases from 3.81 to 1.53; object and skill transfer reach 51.8 and 62.7. Each panel retains its tokenizer’s own PCA basis.' : 'Hand geometry alignment alone (left) and H2RB (right). Arrows show adapter-induced shifts for the same observation. These original manuscript projections retain their points, axes and colors.';
  document.querySelectorAll('[data-projection]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projection === value)));
  pcaFilters.forEach(input => { input.disabled = true; });
  let failed = false;
  await Promise.all(names.map(async (name, i) => {
    const side = i ? 'right' : 'left';
    const canvas = document.querySelector(`#pca-${side}`);
    canvas.setAttribute('aria-busy', 'true');
    const fallback = new Image();
    fallback.src = `assets/figures/${name}.png`;
    fallback.alt = `Original manuscript PCA: ${isAction ? i ? 'with latent regularization' : 'without latent regularization' : 'conditioning features'}`;
    canvas.replaceChildren(fallback);
    try {
      if (!pcaCache.has(name)) pcaCache.set(name, fetch(`assets/figures/${name}.svg`).then(async response => {
        if (!response.ok) throw new Error('Figure unavailable');
        const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml').documentElement;
        if (svg.localName !== 'svg') throw new Error('Invalid figure');
        return svg;
      }));
      const svg = await pcaCache.get(name);
      if (request !== projectionRequest) return;
      canvas.replaceChildren(document.importNode(svg, true));
    } catch {
      pcaCache.delete(name);
      if (request === projectionRequest) failed = true;
    } finally {
      if (request === projectionRequest) canvas.setAttribute('aria-busy', 'false');
    }
  }));
  if (request !== projectionRequest) return;
  pcaControls.hidden = false;
  pcaFilters.forEach(input => { input.disabled = failed; });
  filterProjection();
  if (failed) document.querySelector('#pca-status').textContent = 'Showing original figures; domain filters could not load.';
}

document.querySelectorAll('[data-projection]').forEach(button => button.addEventListener('click', () => setProjection(button.dataset.projection)));
pcaFilters.forEach(input => input.addEventListener('change', filterProjection));
setProjection('conditioning');

const htMixture = document.querySelector('#ht-mixture');
const htTooltips = [...htMixture.querySelectorAll('[role="tooltip"]')];
let htDismissed = false;
function showHTDomain(domain) {
  if (domain && htDismissed) return;
  htTooltips.forEach(tooltip => { tooltip.hidden = tooltip.id !== `ht-${domain}-tooltip`; });
}
htMixture.querySelectorAll('[data-ht-domain]').forEach(control => {
  control.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showHTDomain(control.dataset.htDomain); });
  control.addEventListener('focus', () => { htDismissed = false; showHTDomain(control.dataset.htDomain); });
  control.addEventListener('click', () => { htDismissed = false; showHTDomain(control.dataset.htDomain); });
});
htMixture.addEventListener('pointerleave', () => {
  showHTDomain(htMixture.contains(document.activeElement) ? document.activeElement.dataset.htDomain : '');
  htDismissed = false;
});
htMixture.addEventListener('focusout', event => { if (!htMixture.contains(event.relatedTarget)) { showHTDomain(''); htDismissed = false; } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { htDismissed = true; showHTDomain(''); } });
document.addEventListener('pointerdown', event => { if (!htMixture.contains(event.target)) { showHTDomain(''); htDismissed = false; } });
