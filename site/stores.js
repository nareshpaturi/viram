import { APP_STORE_URL, PLAY_STORE_URL } from './config.js';

const appStore = document.getElementById('app-store');
if (APP_STORE_URL) {
  appStore.href = APP_STORE_URL;
  appStore.hidden = false;
}
document.getElementById('play-store').href = PLAY_STORE_URL;
