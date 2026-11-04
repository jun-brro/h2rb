const timeLabel = time => `${String(Math.floor(Math.max(0, time) / 60)).padStart(2, '0')}:${(Math.max(0, time) % 60).toFixed(1).padStart(4, '0')}`;
const videoGroups = [...document.querySelectorAll('[data-video-viewer]')].map(element => ({ element, videos: [...element.querySelectorAll('video')], toggle: element.querySelector('[data-playback-toggle]') }));
const requestedPlayback = new Map(videoGroups.flatMap(group => group.videos.map(video => [video, !motion.matches && group.element.dataset.autoplay !== 'false'])));
const visibleVideos = new Set();

function refreshPlayback() {
  for (const group of videoGroups) {
    const paused = !group.videos.some(video => requestedPlayback.get(video));
    if (group.toggle) {
      group.toggle.setAttribute('aria-pressed', String(paused));
      group.toggle.querySelector('span').textContent = paused ? 'Play videos' : 'Pause videos';
      group.toggle.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} both ${group.element.dataset.viewerLabel} recordings`);
      group.toggle.querySelector('path').setAttribute('d', paused ? 'M6 3 16 10 6 17Z' : 'M7 4v12M13 4v12');
    }
    for (const video of group.videos) {
      if (!requestedPlayback.get(video) || !visibleVideos.has(video) || !video.getClientRects().length || document.hidden || video.error) video.pause();
      else if (video.paused) video.play().catch(error => {
        if (error.name === 'AbortError') return;
        requestedPlayback.set(video, false);
        refreshPlayback();
      });
    }
  }
}

function toggleVideo(video) {
  if (video.ended) video.currentTime = 0;
  requestedPlayback.set(video, video.paused);
  refreshPlayback();
}

function updatePlayer(view) {
  const { video, seek, play, surface, clock } = view;
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const current = video.currentTime;
  seek.disabled = !Number.isFinite(video.duration);
  play.disabled = !!video.error;
  surface.disabled = !!video.error;
  seek.max = duration || 1;
  seek.value = current;
  seek.style.setProperty('--progress', `${duration ? current / duration * 100 : 0}%`);
  seek.setAttribute('aria-valuetext', duration ? `${timeLabel(current)} of ${timeLabel(duration)}` : 'Recording not loaded');
  clock.textContent = `${timeLabel(current)} / ${Number.isFinite(video.duration) ? timeLabel(duration) : '--:--.-'}`;
  const name = video.getAttribute('aria-label') || 'recording';
  const label = `${video.ended ? 'Replay' : video.paused ? 'Play' : 'Pause'} ${name}`;
  seek.setAttribute('aria-label', `Seek ${name}`);
  view.expand.setAttribute('aria-label', `Expand ${name}`);
  play.setAttribute('aria-label', label);
  surface.setAttribute('aria-label', label);
  play.querySelector('path').setAttribute('d', video.paused ? 'M6 3 16 10 6 17Z' : 'M7 4v12M13 4v12');
  surface.querySelector('path').setAttribute('d', video.paused ? 'M6 3 16 10 6 17Z' : 'M7 4v12M13 4v12');
  view.shell.classList.toggle('is-paused', video.paused);

}

function seekVideo(view, time) {
  if (!Number.isFinite(view.video.duration)) return;
  requestedPlayback.set(view.video, false);
  refreshPlayback();
  view.video.currentTime = Math.max(0, Math.min(time, view.video.duration));
  updatePlayer(view);
}

for (const group of videoGroups) {
  group.toggle?.addEventListener('click', () => {
    const play = !group.videos.some(video => requestedPlayback.get(video));
    group.videos.forEach(video => {
      if (play && video.ended) video.currentTime = 0;
      requestedPlayback.set(video, play && !video.error);
    });
    refreshPlayback();
  });
  for (const video of group.videos) {
    const role = video.getAttribute('aria-label') || 'recording';
    const figure = video.closest('figure');
    const shell = document.createElement('div');
    shell.className = 'video-shell';
    video.before(shell);
    shell.append(video);
    const surface = document.createElement('button');
    surface.className = 'video-surface-toggle';
    surface.type = 'button';
    surface.innerHTML = '<span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3 16 10 6 17Z"/></svg></span>';
    shell.append(surface);
    const panel = document.createElement('div');
    panel.className = 'player-panel';
    panel.innerHTML = `<div class="player-controls"><button class="player-play icon-button" type="button"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3 16 10 6 17Z"/></svg></button><input class="video-seek" type="range" min="0" max="1" step="0.01" value="0" aria-label="Seek ${role} recording"><output class="player-clock">00:00.0</output><button class="player-expand icon-button" type="button" aria-label="Expand ${role} recording"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3H3v4m10-4h4v4M3 13v4h4m6 0h4v-4"/></svg></button></div>`;
    shell.after(panel);
    const view = { video, shell, surface, play: panel.querySelector('.player-play'), seek: panel.querySelector('.video-seek'), clock: panel.querySelector('.player-clock'), expand: panel.querySelector('.player-expand') };
    if (!video.hasAttribute('muted')) {
      const audio = document.createElement('div');
      audio.className = 'player-audio';
      audio.innerHTML = '<button class="player-mute icon-button" type="button"><svg viewBox="0 0 20 20" aria-hidden="true"><path/></svg></button><input class="player-volume" type="range" min="0" max="1" step="0.05" value="1">';
      view.expand.before(audio);
      const mute = audio.querySelector('button');
      const volume = audio.querySelector('input');
      volume.setAttribute('aria-label', `Volume for ${role}`);
      const initialVolume = video.volume;
      try {
        video.volume = .5;
        volume.hidden = video.volume !== .5;
        video.volume = initialVolume;
      } catch { volume.hidden = true; }
      const updateVolume = () => {
        const silent = video.muted || video.volume === 0;
        mute.setAttribute('aria-label', `${silent ? 'Unmute' : 'Mute'} ${role}`);
        mute.setAttribute('aria-pressed', String(silent));
        mute.querySelector('path').setAttribute('d', `M3 8h3l4-4v12l-4-4H3Z ${silent ? 'M13 7l5 6m0-6-5 6' : 'M13 7a4 4 0 0 1 0 6M15 4a8 8 0 0 1 0 12'}`);
        volume.value = silent ? 0 : video.volume;
        volume.setAttribute('aria-valuetext', `${Math.round(Number(volume.value) * 100)}%`);
      };
      mute.addEventListener('click', () => {
        if (video.muted || video.volume === 0) { video.muted = false; if (video.volume === 0) video.volume = 1; }
        else video.muted = true;
        updateVolume();
      });
      volume.addEventListener('input', () => { video.volume = Number(volume.value); video.muted = video.volume === 0; updateVolume(); });
      video.addEventListener('volumechange', updateVolume);
      updateVolume();
    }
    view.play.addEventListener('click', () => toggleVideo(video));
    surface.addEventListener('click', () => toggleVideo(video));
    view.seek.addEventListener('input', () => seekVideo(view, Number(view.seek.value)));
    panel.querySelector('.player-expand').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (figure.requestFullscreen) await figure.requestFullscreen();
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      } catch { /* Playback and seeking remain available if fullscreen is denied. */ }
    });
    let frame = null;
    const cancelFrame = () => {
      if (frame === null) return;
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frame);
      else cancelAnimationFrame(frame);
      frame = null;
    };
    const animate = () => {
      updatePlayer(view);
      if (!video.paused && !video.ended) frame = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(animate) : requestAnimationFrame(animate);
      else frame = null;
    };
    video.addEventListener('playing', () => { cancelFrame(); animate(); });
    video.addEventListener('pause', () => { cancelFrame(); updatePlayer(view); });
    video.addEventListener('ended', () => { requestedPlayback.set(video, false); refreshPlayback(); });
    video.addEventListener('error', () => {
      requestedPlayback.set(video, false);
      const error = figure.querySelector('.media-error');
      error.hidden = false;
      error.querySelector('a').href = video.getAttribute('src');
      refreshPlayback();
    });
    video.defaultPlaybackRate = Number(video.dataset.playbackRate) || 3;
    video.playbackRate = video.defaultPlaybackRate;
    const updateRate = () => { figure.querySelector('.film-rate').textContent = `${video.playbackRate}×`; };
    video.addEventListener('ratechange', updateRate);
    updateRate();
    for (const event of ['timeupdate', 'loadedmetadata', 'seeked', 'emptied', 'ended', 'error']) video.addEventListener(event, () => updatePlayer(view));
    video.controls = false;
    updatePlayer(view);
  }
}

document.querySelectorAll('[data-speed-note]').forEach(note => { note.textContent = '3× playback; timecodes use recorded seconds.'; });
document.addEventListener('visibilitychange', refreshPlayback);
motion.addEventListener('change', event => {
  if (event.matches) { requestedPlayback.forEach((value, video) => requestedPlayback.set(video, false)); refreshPlayback(); }
});
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleVideos.add(entry.target);
      else visibleVideos.delete(entry.target);
    }
    refreshPlayback();
  }, { threshold: .1 });
  requestedPlayback.forEach((value, video) => observer.observe(video));
} else requestedPlayback.forEach((value, video) => visibleVideos.add(video));
refreshPlayback();
