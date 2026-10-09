// Links every store button on the page, or shows “Coming soon” while Viram
// isn't live in either store yet. Without JavaScript the buttons stay hidden
// and “Coming soon” shows, which is right until launch.
import { APP_STORE_URL, PLAY_STORE_URL } from './config.js';

const urls = { app: APP_STORE_URL, play: PLAY_STORE_URL };
for (const button of document.querySelectorAll('[data-store]')) {
  const url = urls[button.dataset.store];
  if (!url) continue;
  button.href = url;
  button.hidden = false;
}
if (APP_STORE_URL || PLAY_STORE_URL) {
  for (const soon of document.querySelectorAll('[data-soon]')) soon.hidden = true;
}
