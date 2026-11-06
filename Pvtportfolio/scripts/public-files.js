export const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/css/style.css', ['css/style.css', 'text/css; charset=utf-8']],
  ['/js/script.js', ['js/script.js', 'text/javascript; charset=utf-8']],
  ...['gsap','ScrollTrigger'].map(name => [`/js/vendor/${name}.min.js`, [`js/vendor/${name}.min.js`, 'text/javascript; charset=utf-8']]),
  ['/assets/profile.jpg', ['assets/profile.jpg', 'image/jpeg']],
  ['/assets/social-card.png', ['assets/social-card.png', 'image/png']],
  ['/assets/favicon.svg', ['assets/favicon.svg', 'image/svg+xml']],
  ...[['barlow-condensed',[600,700]],['space-grotesk',[400,500,600,700]]].flatMap(([family,weights]) => weights.map(weight => [`/assets/fonts/${family}-${weight}.woff2`,[`assets/fonts/${family}-${weight}.woff2`,'font/woff2']]))
]);
