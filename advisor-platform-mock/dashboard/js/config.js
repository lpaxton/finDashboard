// @ts-check
/* The only file to edit when connecting to the real backend. */
export const CONFIG = Object.assign({
  mode: 'mock',                 // 'mock' = in-page mock; 'live' = call a backend
  baseUrl: '',                  // backend host; the /v1 prefix is added by api()
  personaPicker: false,         // live mode only: show the sign-in-as buttons (for the standalone mock server)
  getToken: null                // async () => bearer token; defaults to the chosen persona when personaPicker is on
}, /** @type {any} */ (window).ADVISOR_CONFIG || {});
export let currentPersona = 'dana';
if (!CONFIG.getToken) CONFIG.getToken = async () => (CONFIG.personaPicker ? currentPersona : null);
export const FAIL = new URLSearchParams(location.search).get('fail'); // mock only: ?fail=alerts shows an error state
/** @param {string} p */
export const setPersona = (p) => { currentPersona = p; };
