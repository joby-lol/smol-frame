# smolFrame

A zero-dependency, ultra-lightweight (~1.3KB gzipped) Progressive Enhancement engine for server-rendered web applications.

`smolFrame` intercepts standard links and form submissions, fetches full HTML documents via `fetch`, parses out target DOM fragments, and swaps them seamlessly without breaking page reloads, SEO, or browser history.

## Philosophy

* **Progressive Enhancement First:** Your web application works 100% out of the box with JavaScript disabled using standard HTTP links, HTML forms, and server redirects.
* **Zero Double-Life Controllers:** Server endpoints render standard, full HTML pages. `smolFrame` extracts the relevant container fragment on the client side.
* **Tiny Payload:** Under 6.5KB raw / ~1.3KB gzipped. No Virtual DOM, no complex dependencies, no heavy SPA build tooling.

## Features

- **Link Interception:** Seamlessly upgrades standard `<a>` tags to partial frame swaps.
- **Form Interception:** Intercepts both `GET` and `POST` forms (including button `submitter` values) automatically.
- **Smart Browser History:** Updates `window.history` and document `title` for `GET` requests; treats non-`GET` mutations as stateless by default.
- **Element Syncing:** Synchronize peripheral elements (like flash banners, shopping carts, or navigation menus) in a single navigation pass using `data-frame-sync`.
- **Server Override Control:** Dynamic target overrides via the `X-Target-Frame` HTTP response header.
- **Loading & Error Attributes:** Exposes declarative hooks (`data-frame-loading`, `data-frame-submitting`, `data-frame-error`) for effortless CSS styling.

## Quick Start

1. Include `smolFrame.js` in your document (or bundle it):

```html
<script src="/js/smol-frame.js"></script>
```

2. Mark your replacement region with `data-frame` and a unique `id`:

```html
<main id="app-content" data-frame>
  <h1>Welcome to Nodez</h1>
  <a href="/admin/nodes" data-frame-target="app-content">Manage Nodes</a>
</main>
```

When clicked, `smolFrame` fetches `/admin/nodes`, extracts the element matching `#app-content` from the returned HTML, replaces its inner content, updates the URL history, and updates the document title!

## HTML Attributes Reference

| Attribute                    | Applied To                  | Description                                                                                         |
| :--------------------------- | :-------------------------- | :-------------------------------------------------------------------------------------------------- |
| `data-frame`                 | Container                   | Marks an element as an interceptable `smolFrame` target container.                                  |
| `data-frame-target="<id>"`   | `<a>`, `<form>`, `<button>` | Specifies the target container `id` to swap content into. Searches parent tree if omitted.          |
| `data-frame-target="_frame"` | `<a>`, `<form>`, `<button>` | Targets the nearest parent container with a `data-frame` attribute.                                 |
| `data-frame-stateless`       | Container                   | Prevents pushState URL / history changes for requests targeting this frame.                         |
| `data-frame-hide-missing`    | Container                   | Hides the container (`display: none`) if the response document does not contain a matching element. |
| `data-frame-sync`            | Any Element                 | Keeps peripheral elements with matching `id`s in sync with the server response document.            |

## Usage Examples

### Basic Link Swapping

Target an explicit container by `id`:

```html
<a href="/nodes/10" data-frame-target="main-frame">View Node 10</a>

<div id="main-frame" data-frame>
  </div>
```

### Targeting the Nearest Frame (`_frame`)

You can tell links or forms to swap their surrounding parent container without hardcoding an `id`:

```html
<div id="card-42" data-frame>
  <p>Node status: Active</p>
  <a href="/nodes/42/edit" data-frame-target="_frame">Edit</a>
</div>
```

### Form Interception (`GET` & `POST`)

Forms targeting a frame are automatically intercepted:

```html
<form action="/search" method="GET" data-frame-target="search-results">
  <input type="search" name="q" placeholder="Search..." autofocus />
  <button type="submit">Search</button>
</form>

<section id="search-results" data-frame>
  </section>
```

```html
<form action="/nodes/42/update" method="POST" data-frame-target="_frame">
  <input type="text" name="title" value="Current Title" />
  <button type="submit" name="action" value="save">Save Changes</button>
</form>
```

*Note: Non-`GET` requests are automatically treated as stateless (they will not push history state).*

### Syncing Auxiliary Elements (`data-frame-sync`)

Sometimes a frame update should also refresh external widgets, such as a flash message notification area or a counter badge in a navbar. Add `data-frame-sync` and a matching `id`:

```html
<div id="flash-area" data-frame-sync>
  </div>

<main id="content" data-frame>
  </main>
```

When navigating `#content`, `smolFrame` checks if the returned page contains `#flash-area`. If found, its inner content is updated in sync with the primary frame exchange.

## Server Responses & Headers

### Server Target Overrides (`X-Target-Frame` and `X-Source-Frame`)
Your server can dynamically instruct `smolFrame` to redirect output to a *different* container than the request originally targeted by sending the `X-Target-Frame` HTTP response header, and/or pull content from a different container in the response using `X-Source-Frame`:

```http
HTTP/1.1 200 OK
Content-Type: text/html
X-Target-Frame: global-modal
X-Source-Frame: updated-modal-content
```

### Identifying `smolFrame` Requests
Every fetch request sent by `smolFrame` includes the `X-Smol-Frame` header containing the target frame's ID:

```http
X-Smol-Frame: main-frame
```

## Styling Loading & Error States

During a frame exchange, `smolFrame` sets temporary dataset attributes on target elements. You can style these different states using pure CSS:

```css
/* Styling frame loading states */
[data-frame][data-frame-loading] {
  opacity: 0.6;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

/* Form submission styling */
[data-frame][data-frame-submitting] {
  cursor: wait;
}

/* Error banner styling */
[data-frame][data-frame-error]::before {
  content: "Error: " attr(data-frame-error);
  display: block;
  padding: 0.5rem 1rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 4px;
  margin-bottom: 1rem;
}
```

## Custom Events & Manual Actions

### `smol-frame:loaded`
Dispatched on the target frame element after content has been fetched, parsed, and injected into the DOM.

```javascript
document.addEventListener('smol-frame:loaded', (e) => {
  console.log('Frame loaded:', e.target, 'URL:', e.detail.url);
});
```

### Manual Reload Trigger (`smol-frame:reload`)
You can trigger a frame to re-fetch its last known URL by dispatching a `smol-frame:reload` event anywhere inside or on the frame element:

```javascript
const frame = document.getElementById('my-frame');
frame.dispatchEvent(new CustomEvent('smol-frame:reload', { bubbles: true }));
```

## License

MIT License - See [LICENSE](LICENSE) file for details.