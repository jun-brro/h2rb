(() => {
  const { measurementId, hostname, basePath } = document.currentScript.dataset;
  if (!/^G-[A-Z0-9]+$/.test(measurementId || '') || !hostname || !basePath) return;
  if (location.protocol !== 'https:' || location.hostname !== hostname) return;
  if (location.pathname !== basePath && !location.pathname.startsWith(`${basePath}/`)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(tag);
})();
