// Production server for Hostinger hPanel Node hosting. Boots Next in prod mode
// and binds to the platform-assigned PORT on all interfaces. The next.config
// rewrites (the /v1 + /r API proxy) are applied by Next's request handler,
// so the browser still talks to this origin and no CORS is needed.
const { createServer } = require("http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, "0.0.0.0", () => {
    console.log(`Next ready on http://0.0.0.0:${port}`);
  });
});
