/**
 * smolFrame
 * https://github.com/joby-lol/smol-frame
 * (c) 2026 Joby Elliott code@joby.lol
 * MIT License https://opensource.org/licenses/MIT
 */
const SmolFrame = {
  init() {
    // Tag initial page load into history state so Back button works to step 0
    SmolFrame.initHistoryState();

    // Intercept Clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link || !link.href) return;

      const targetObject = SmolFrame.findTargetObject(link);
      if (!targetObject) return;

      e.preventDefault();
      SmolFrame.navigate(link.href, targetObject);
    });

    // Intercept Form Submits
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (!form) return;

      const targetObject = SmolFrame.findTargetObject(e.submitter) ?? SmolFrame.findTargetObject(form);
      if (!targetObject) return;

      e.preventDefault();
      const action = form.action || window.location.href;
      const method = (form.method || 'GET').toUpperCase();
      const data = new FormData(form);

      if (e.submitter && e.submitter.name)
        data.append(e.submitter.name, e.submitter.value);

      let url = action;
      let body = data;
      if (method === 'GET') {
        const urlObj = new URL(action);
        data.forEach((val, key) => urlObj.searchParams.set(key, val));
        url = urlObj.toString();
        body = null;
      }

      SmolFrame.navigate(url, targetObject, { method, body, isSubmit: true });
    });

    // Handle History Popstate (Back/Forward)
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.frameId && e.state.url) {
        const targetObject = document.getElementById(e.state.frameId);
        if (targetObject) {
          SmolFrame.navigate(e.state.url, targetObject, { pushState: false });
          return;
        }
      }
      // Fallback: Full page reload if history state was unhandled
      window.location.reload();
    });

    // Bind custom frame events (reload)
    document.addEventListener('smol-frame:reload', (e) => {
      const frame = e.target.closest('[data-frame]');
      if (frame && frame.dataset.currentUrl) {
        SmolFrame.navigate(frame.dataset.currentUrl, frame, { pushState: false });
      }
    });
  },

  initHistoryState() {
    // Set baseline state for the initial page load if not already set
    if (history.state)
      return;
    const mainFrame = document.querySelector('[data-frame]:not([data-frame-stateless])');
    if (mainFrame && mainFrame.id)
      history.replaceState(
        { url: window.location.href, frameId: mainFrame.id },
        document.title,
        window.location.href
      );
  },

  findTargetObject(element) {
    if (!element) return false;
    const targetID = SmolFrame.findTargetID(element);
    if (!targetID) return false;

    if (targetID === '_frame')
      return SmolFrame.findNearestFrame(element);

    const targetObject = document.getElementById(targetID);
    if (!targetObject || !targetObject.hasAttribute('data-frame'))
      return false;

    return targetObject;
  },

  findTargetID(element) {
    if (!element || element === document.body) return false;
    const targetID = element.dataset.frameTarget ?? SmolFrame.findTargetID(element.parentElement);
    if (!targetID || targetID === '_top' || targetID === '_blank') return false;
    return targetID;
  },

  findNearestFrame(element) {
    if (!element || element === document.body) return false;
    if (element.hasAttribute('data-frame')) return element;
    return SmolFrame.findNearestFrame(element.parentElement);
  },

  async navigate(url, targetObject, options = {}) {
    let finalTargetEl = targetObject;

    targetObject.setAttribute('data-frame-loading', '');
    if (options.isSubmit) targetObject.setAttribute('data-frame-submitting', '');
    targetObject.removeAttribute('data-frame-error');

    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        body: options.body,
        headers: {
          'X-Smol-Frame': targetObject.id || '',
          ...(options.headers || {})
        }
      });

      if (!res.ok)
        throw new Error(`HTTP ${res.status}: ${res.statusText || 'Request failed'}`);

      const overrideSourceId = res.headers.get('X-Source-Frame');
      const overrideTargetId = res.headers.get('X-Target-Frame');
      if (overrideTargetId)
        finalTargetEl = document.getElementById(overrideTargetId) || targetObject;

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newContent = overrideSourceId
        ? doc.getElementById(overrideSourceId)
        : (finalTargetEl.id ? doc.getElementById(finalTargetEl.id) : null);

      if (!newContent) {
        if (finalTargetEl.hasAttribute('data-frame-hide-missing'))
          finalTargetEl.style.display = 'none';
        else
          window.location.href = url; // Fallback
        return;
      }

      // update html and frame state
      finalTargetEl.innerHTML = newContent.innerHTML;
      finalTargetEl.setAttribute('data-current-url', res.url || url);
      const offset = finalTargetEl.getBoundingClientRect();
      const topOver = offset.top < 0;
      const bottomUnder = offset.bottom > window.innerHeight;
      var scroll = 'start';
      if (!topOver && !bottomUnder)
        scroll = false;
      else if (topOver)
        scroll = 'start';
      else if (bottomUnder)
        scroll = 'end';
      if (scroll)
        finalTargetEl.scrollIntoView({
          behavior: "smooth",
          inline: "nearest",
          block: scroll
        });

      // handle title and history
      const isStateless = finalTargetEl.hasAttribute('data-frame-stateless')
        || options.method !== 'GET';
      if (!isStateless) {
        const newTitle = doc.querySelector('title');
        if (newTitle) document.title = newTitle.innerText;

        doc.querySelectorAll('[data-frame-sync]')
          .forEach(syncElement => {
            if (!syncElement.id) return;
            const targetElement = document.getElementById(syncElement.id);
            if (!targetElement) return;
            targetElement.innerHTML = syncElement.innerHTML;
          });

        if (options.pushState !== false && finalTargetEl.id)
          history.pushState({ url: res.url || url, frameId: finalTargetEl.id }, document.title, res.url || url);
      }

      // autofocus
      const autofocusEl = finalTargetEl.querySelector('[autofocus]');
      if (autofocusEl) autofocusEl.focus();

      // dispatch loaded event
      finalTargetEl.dispatchEvent(new CustomEvent('smol-frame:loaded', { bubbles: true, detail: { url } }));

    } catch (err) {
      console.error('[smolFrame] Load error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      finalTargetEl.setAttribute('data-frame-error', errorMessage);
    } finally {
      targetObject.removeAttribute('data-frame-loading');
      targetObject.removeAttribute('data-frame-submitting');
      if (finalTargetEl && finalTargetEl !== targetObject) {
        finalTargetEl.removeAttribute('data-frame-loading');
        finalTargetEl.removeAttribute('data-frame-submitting');
      }
    }
  }
};

window.SmolFrame = SmolFrame;
document.addEventListener('DOMContentLoaded', () => SmolFrame.init());