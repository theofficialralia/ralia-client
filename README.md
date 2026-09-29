<div align="center">

# ð§âð¼ Ralia for Business

### Book real reach. Pay for verified results.

<br/>

![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)

![Port](https://img.shields.io/badge/dev_port-6300-E11D48?style=flat-square)

</div>

---

The **client** app is where a business launches a campaign, watches it fill with promoters, and
reviews the **verified** proof of every post it paid for. It's a Next.js app that proxies the API
server-side â so the browser is always same-origin and there's **no CORS to manage**.

## ð¯ Create-campaign wizard

```mermaid
flowchart LR
    A["ð Brief<br/>name Â· objective Â· link<br/>run window Â· cadence"] --> B["ð¨ Assets<br/>upload or ask Ralia"]
    B --> C["ð¯ Targeting<br/>multi-select: location, age,<br/>gender, language, category, platform"]
    C --> D["ðµ Live quote<br/>slider Â· slots Ã posts"]
    D --> E["ð Fund<br/>escrow â LIVE"]

    classDef s fill:#fff1f2,stroke:#E11D48,color:#881337;
    class A,B,C,D,E s;
```

- **Multi-day campaigns** â pick a run window and a cadence (one-off, daily, weekly, or a custom
  number of posts). The quote scales with posts, so pricing is always honest.
- **Multi-select targeting** â target several states, ages, languages, categories and platforms at
  once; the live quote moves with every choice.

## ð¼ï¸ Evidence gallery

Every approved post shows up as a screenshot card â filterable by platform, zoomable, with the
verified view count. The client **only ever sees approved work**: nothing appears until an admin
has verified it.

```mermaid
flowchart LR
    P[ð£ Promoter posts] --> Adm{ð¡ï¸ Admin verifies}
    Adm -->|approved| G[ð¼ï¸ Evidence gallery]
    Adm -->|rejected| X[â never shown to client]
    classDef ok fill:#dcfce7,stroke:#16a34a,color:#14532d;
    class G ok;
```

## ð§­ How it talks to the API

```mermaid
flowchart LR
    Browser -->|same-origin| Next[Next.js server]
    Next -->|"/v1/* Â· /r/* rewrite"| API[(Ralia API)]
```

`next.config.mjs` rewrites `/v1` and `/r` to `API_ORIGIN` on the server â set it to the deployed
API URL in production.

## ð Quickstart

```bash
npm install
cp .env.example .env     # set API_ORIGIN (defaults to http://localhost:6100)
npm run dev              # http://localhost:6300
```

Seeded logins: `client1@ralia.test` / `client2@ralia.test` Â· password `Password123!`

<details>
<summary><b>ð Environment</b></summary>

| Variable | Purpose |
|---|---|
| `API_ORIGIN` | The API origin the Next server proxies `/v1` + `/r` to |
| `NODE_ENV` | `production` in deploys |
</details>

<details>
<summary><b>ð ï¸ Scripts</b></summary>

| Script | Does |
|---|---|
| `dev` | dev server on :6300 |
| `build` | production build |
| `start:prod` | `node server.js` (only for a self-hosted Node host; Vercel builds natively) |
| `typecheck` | `tsc --noEmit` |
</details>

## ð¢ Deployment

Deploys to **Vercel** (native Next.js) — import the repo, set `API_ORIGIN` + `NEXT_PUBLIC_APP_ENV`, and Vercel builds each push. See `DEPLOY.md`.

---

<div align="center">
<sub>Part of Ralia Â· <a href="../ralia-api">API</a> Â· <a href="../ralia-admin">Admin</a> Â· <a href="../ralia-promoter">Promoter</a></sub>
</div>
