// Fills the share-link page with textContent only: link content is never markup.
import { decodePayload, describeSteps, describeTarget } from './decode.js';

const raw = location.pathname.replace(/^\/r\//, '').replace(/\/$/, '');
let payload = '';
try {
  payload = decodeURIComponent(raw);
} catch {
  // A malformed link is shown as invalid below.
}
const practice = decodePayload(payload);
const text = (id, value) => (document.getElementById(id).textContent = value);

if (practice) {
  text('name', practice.name);
  text('based-on', practice.technique ? `${practice.technique.name} · ${practice.technique.subtitle.toLowerCase()}` : 'Custom rhythm');
  const rhythm = describeSteps(practice.steps);
  text('rhythm', rhythm.charAt(0).toUpperCase() + rhythm.slice(1));
  text('target', describeTarget(practice.target));
  document.title = `${practice.name} · shared with Viram`;
  const open = document.getElementById('open-app');
  open.href = `viram://r/${payload}`;
  open.hidden = false;
} else {
  text('kicker', 'Shared link');
  text('name', 'This link can’t be opened.');
  document.getElementById('invalid').hidden = false;
}
