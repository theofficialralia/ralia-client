# Ralia — Client (business) web app

The business-facing web app for Ralia: a two-sided marketplace where businesses
fund campaigns and promoters post them for a fee. This repo is the **Client**
app only. The API lives in a separate repo (`ralia-api`); the promoter and admin
apps are not designed yet.

Nothing is built here yet — this repo is seeded with the designs and the frozen
API contract so UI work can begin against a fixed target.

## Layout

```
designs/            The 17 client screens (PNG), from the designer.
api-contract/       openapi.json — the frozen API contract, copied from ralia-api.
                    Regenerate in ralia-api with `make openapi` and copy it here
                    when the API surface changes.
```

## Build against the contract, not against your memory of it

Every screen maps to endpoints in `api-contract/openapi.json`. Browse it at
<https://editor.swagger.io> (File → Import file), or run the API locally
(`make up` in ralia-api) and open <http://localhost:3000/docs>.

Money is always integer **kobo** in the API. A field is `{ amount_minor: 603750,
amount_display: "₦6,037.50" }` — render `amount_display`, never do currency math
in the browser.

## Read this before implementing the designs literally

The designs were drawn ahead of the backend and, in several places, assume a
**different product** than the one that was scoped and built. Implementing them
1:1 would build features that are explicitly out of scope, or that the API does
not support. Resolve each of these with the client before building the screen.

### Scope conflicts — do not build as drawn

1. **Self-service card payments are out of scope.** The create-campaign flow ends
   in a "Fund the campaign" step with card / USSD / bank transfer, "settles
   instantly", and a Paystack card form. The SOW excludes payment gateways and
   card checkout — **money is admin-recorded**. The real flow: the client submits
   a campaign, an admin approves it, the client sends a bank transfer out of band,
   and an admin records it (`POST /admin/campaigns/{id}/fund`). There is no
   client-facing payment endpoint. Building the Paystack step is a paid change
   order, and it pulls the product into PCI-DSS scope. **Settle this first.**

2. **OTP goes to the phone, not email.** The Verify screen shows an email OTP. The
   API sends the OTP to the WhatsApp/phone number captured at registration
   (`/auth/otp/request`, `/auth/otp/verify` take `phone_e164`). Either re-point
   the screen to phone/WhatsApp, or add email verification to the API — today it
   is phone-only.

3. **No prepaid wallet.** The dashboard shows a fundable "Wallet balance" spent
   across campaigns. The API funds **per campaign** (one escrow per campaign),
   with no cross-campaign wallet. Either drop the wallet concept from the UI or
   add a wallet model to the API.

### API work these screens need that is not built yet

4. **Campaign analytics + report export** (views delivered, acceptance rate,
   cost-per-view, "Export report") — the analytics endpoint is deferred and there
   is no export. Needed for the campaign-detail screen.

5. **Pause campaign** — the Pause button needs an endpoint; the `PAUSED` status
   exists but the transition is not exposed yet.

### Unit economics

6. The mockups assume ~₦250,000 campaigns (~₦4/view). The API's default pricing
   (RPM ₦30 per 1,000 views) produces campaigns ~30× smaller. The RPM is config;
   set it to the real economics before the Quote screen goes in front of anyone.

### Copy / content fixes (carry into implementation)

- "Procced" → "Proceed" (several buttons).
- "At lease 8 characters" → "At least" — and the API minimum is **10**, not 8.
- The ₦ sign renders as `#` in the testimonial's italic font; pick a font with
  the glyph or embed it.
- The register screen collects "Full name" for a business; the API's client model
  has no such field (a client is an organisation).
- Terms and privacy are one checkbox; the API records consent per purpose and
  wants each individually revocable — prefer two.

## Stack

Not chosen yet. The design brief calls for a mobile-first, component-library-level
build. Pick the framework when frontend work is scheduled.
