const tasks = {
  open: { title: 'Open the air fryer.', note: 'Skill transfer · instruction-conditioned variant' },
  close: { title: 'Close the air fryer.', note: 'Skill transfer · instruction-conditioned variant' },
  box: { title: 'Pick up the box and place it in the white container.', note: 'Object transfer · H2RB + heterogeneous training' },
  ball: { title: 'Pick up the ball and place it in the white container.', note: 'Object transfer · geometry + latent actions' },
  towel: { title: 'Pick up the towel and place it in the white container.', note: 'Object transfer · geometry + latent actions' }
};

const resultSets = {
  object: { title: 'New objects, a familiar skill', description: 'Box, ball and towel. Target-object demonstrations come from humans.', values: [8, 10.7, 27.2, 51.8], takeaway: 'H2RB improves average object-transfer score from 8.0 to 51.8.' },
  skill: { title: 'New interactions, learned from unpaired human demos', description: 'Opening and closing. Neither interaction appears in the source robot demonstrations.', values: [0, 0, 0, 62.7], takeaway: 'H2RB reaches 62.7 on skill transfer, where the shared-action co-training baselines score 0.0.' },
  ood: { title: 'The same task, in a new place', description: 'Target objects are evaluated outside the in-distribution placement region.', values: [6, 12, 21.3, 45.3], takeaway: 'Under placement shift, H2RB raises the co-training score from 6.0 to 45.3.' }
};

const videos = [...document.querySelectorAll('#openarm-viewer video')];
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const chart = document.querySelector('#result-chart');
const trainingPanel = document.querySelector('#training-datasets');
const trainingTasks = {
  object: {
    human: [{ id: 'box', label: 'Box' }, { id: 'ball', label: 'Ball' }, { id: 'towel', label: 'Towel' }],
    robot: [{ id: 'bottle', label: 'Bottle', version: '1121965880c1' }, { id: 'cup', label: 'Cup', version: 'e2b09493ed71' }, { id: 'doll', label: 'Doll', version: '5e8ba9c83297' }, { id: 'snack', label: 'Snack', version: '15a1ddf4608d' }]
  },
  skill: {
    human: [{ id: 'open', label: 'Open' }, { id: 'close', label: 'Close' }],
    robot: [{ id: 'box', label: 'Box', version: '53d2246a6623' }, { id: 'ball', label: 'Ball', version: 'f39bcaf2d4bb' }, { id: 'towel', label: 'Towel', version: '9f0840a1d453' }]
  }
};
let trainingSetting = 'object';

function setRecording(video, source, label) {
  video.pause();
  video.src = source;
  video.poster = source.replace(/\.mp4(?=\?|$)/, '.jpg');
  video.setAttribute('aria-label', label);
  video.closest('figure').querySelector('.media-error').hidden = true;
  video.load();
}

function setTrainingTask(domain, id) {
  const task = trainingTasks[trainingSetting][domain].find(item => item.id === id);
  if (!task) return;
  const column = trainingPanel.querySelector(`[data-training-domain="${domain}"]`);
  const video = column.querySelector('video');
  const name = `${task.label}${id === 'open' || id === 'close' ? ' the air fryer' : ' pick-and-place'}`;
  const source = domain === 'human' ? `assets/media/human-${id}.mp4` : `assets/media/training/${trainingSetting}-robot-${id}.mp4?v=${task.version}`;
  column.querySelectorAll('[data-training-task]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.trainingTask === id)));
  column.querySelector('[data-training-description]').textContent = name;
  requestedPlayback.set(video, false);
  setRecording(video, source, `${domain === 'human' ? 'Human' : 'Robot'} training demonstration: ${name.toLowerCase()}`);
  column.querySelector('.media-error a').href = source;
  refreshPlayback();
}

function setTrainingSetting(setting) {
  const available = Object.hasOwn(trainingTasks, setting);
  trainingPanel.hidden = !available;
  trainingPanel.querySelectorAll('video').forEach(video => { requestedPlayback.set(video, false); video.pause(); });
  if (!available) { refreshPlayback(); return; }
  trainingSetting = setting;
  for (const domain of ['human', 'robot']) {
    const tasks = trainingTasks[setting][domain];
    const column = trainingPanel.querySelector(`[data-training-domain="${domain}"]`);
    column.querySelector('.task-options').replaceChildren(...tasks.map(task => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.trainingTask = task.id;
      button.textContent = task.label;
      button.setAttribute('aria-pressed', 'false');
      return button;
    }));
    setTrainingTask(domain, tasks[0].id);
  }
}

trainingPanel.addEventListener('click', event => {
  const button = event.target.closest('[data-training-task]');
  if (!button || !trainingPanel.contains(button) || button.getAttribute('aria-pressed') === 'true') return;
  setTrainingTask(button.closest('[data-training-domain]').dataset.trainingDomain, button.dataset.trainingTask);
});

document.querySelectorAll('[data-task]').forEach(button => {
  button.addEventListener('click', () => {
    const task = tasks[button.dataset.task];
    if (!task) return;
    document.querySelectorAll('[data-task]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('#task-description').textContent = `“${task.title}”`;
    document.querySelector('#task-note').textContent = task.note;
    videos.forEach(video => {
      const role = video.id.startsWith('human') ? 'human' : 'robot';
      setRecording(video, `assets/media/${role}-${button.dataset.task}.mp4`, `${role === 'human' ? 'Human demonstration' : 'Robot execution'}: ${task.title}`);
    });
    refreshPlayback();
  });
});

document.querySelectorAll('[data-rby1-object], [data-rby1-recording]').forEach(button => {
  button.addEventListener('click', () => {
    const viewer = button.closest('[data-video-viewer]');
    const object = button.dataset.rby1Object;
    const recording = button.dataset.rby1Recording;
    button.parentElement.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    viewer.querySelectorAll('video').forEach(video => {
      const condition = video.dataset.condition;
      const name = condition === 'h2rb' ? 'H2RB geometry-aligned human–robot HT' : 'Robot-only HT';
      const file = object ? `${object}-${condition}` : `${condition}-${recording}-full`;
      setRecording(video, `assets/media/rby1/${file}.mp4`, `${name}: ${object ? `${object} highlight` : `full RB-Y1 recording ${Number(recording)}`}`);
    });
    if (object) document.querySelector('[data-parcel-outcome]').textContent = object === 'carton'
      ? 'The carton stalls with Robot-only HT; an operator clears it at the end. H2RB delivers it label-up.'
      : 'The polybag stays on the input surface with Robot-only HT; an operator clears it at the end. H2RB flips and delivers it.';
    refreshPlayback();
  });
});

document.querySelectorAll('[data-result]').forEach(button => {
  button.addEventListener('click', () => {
    const result = resultSets[button.dataset.result];
    if (!result) return;
    document.querySelectorAll('[data-result]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('#chart-title').textContent = result.title;
    document.querySelector('#chart-description').textContent = result.description;
    document.querySelector('#result-takeaway').textContent = result.takeaway;
    const labels = [];
    document.querySelectorAll('.bar-row').forEach((row, i) => {
      row.querySelector('.bar').style.setProperty('--value', result.values[i]);
      row.querySelector('.bar-value').textContent = result.values[i].toFixed(1);
      labels.push(`${row.querySelector('.bar-label').textContent} ${result.values[i].toFixed(1)}`);
    });
    document.querySelector('#result-chart').setAttribute('aria-label', `${result.title}. Weighted task scores: ${labels.join(', ')}.`);
    setTrainingSetting(button.dataset.result);
  });
});

if (!motion.matches && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    chart.classList.remove('is-waiting');
    chart.querySelectorAll('.bar').forEach(bar => bar.animate?.(
      [{ transform: 'scaleX(0)' }, { transform: `scaleX(${Number(bar.style.getPropertyValue('--value')) / 100})` }],
      { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' }
    ));
    reveal.disconnect();
  }, { threshold: .2 });
  chart.classList.add('is-waiting');
  reveal.observe(chart);
  motion.addEventListener('change', event => {
    if (event.matches) {
      chart.classList.remove('is-waiting');
      chart.querySelectorAll('.bar').forEach(bar => bar.getAnimations().forEach(animation => animation.cancel()));
      reveal.disconnect();
    }
  });
}


const methodFigures = [...document.querySelectorAll('.method-graphic')];
const methodToggle = document.querySelector('#method-toggle');
const methodVisible = new Set();
let methodPaused = false;

function refreshMethodMotion() {
  methodToggle.hidden = !methodFigures.some(figure => figure.querySelector('svg'));
  methodToggle.disabled = motion.matches;
  for (const figure of methodFigures) {
    const svg = figure.querySelector('svg');
    if (!svg || svg.tagName !== 'svg') continue;
    svg.dataset.enabled = String(!motion.matches);
    svg.dataset.playing = String(!motion.matches && !methodPaused && methodVisible.has(figure) && !document.hidden);
  }
  const animations = methodFigures.filter(figure => methodVisible.has(figure)).flatMap(figure => figure.getAnimations({ subtree: true }));
  const finished = animations.length > 0 && animations.every(animation => animation.playState === 'finished');
  methodToggle.dataset.finished = String(finished);
  methodToggle.setAttribute('aria-pressed', String(methodPaused || motion.matches));
  methodToggle.querySelector('span').textContent = motion.matches ? 'Motion reduced' : finished ? 'Replay animation' : methodPaused ? 'Play animation' : 'Pause animation';
  methodToggle.querySelector('path').setAttribute('d', methodPaused || motion.matches || finished ? 'M6 3 16 10 6 17Z' : 'M7 4v12M13 4v12');
}

methodToggle.addEventListener('click', () => {
  if (methodToggle.dataset.finished === 'true') {
    methodFigures.filter(figure => methodVisible.has(figure)).flatMap(figure => figure.getAnimations({ subtree: true })).forEach(animation => { animation.currentTime = 0; });
    methodPaused = false;
  } else methodPaused = !methodPaused;
  refreshMethodMotion();
});
methodFigures.forEach(figure => figure.addEventListener('animationend', refreshMethodMotion));
methodFigures.forEach(async figure => {
  try {
    const response = await fetch(figure.dataset.source);
    if (!response.ok) throw new Error('Figure unavailable');
    const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml').documentElement;
    if (svg.localName !== 'svg') throw new Error('Invalid figure');
    svg.setAttribute('aria-hidden', 'true');
    figure.replaceChildren(document.importNode(svg, true));
    refreshMethodMotion();
  } catch { /* The original static figure remains available. */ }
});
motion.addEventListener('change', refreshMethodMotion);
document.addEventListener('visibilitychange', refreshMethodMotion);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) methodVisible.add(entry.target);
      else methodVisible.delete(entry.target);
    }
    refreshMethodMotion();
  }, { threshold: .15 });
  methodFigures.forEach(figure => observer.observe(figure));
} else { methodFigures.forEach(figure => methodVisible.add(figure)); }
refreshMethodMotion();
