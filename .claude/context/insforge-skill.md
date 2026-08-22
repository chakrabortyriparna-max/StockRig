# InsForge for AI agents

InsForge is the agent-native cloud infrastructure platform: a Postgres-based
backend with database, authentication, storage, edge functions, compute,
hosting, and an AI model gateway. A coding agent drives it end to end through
the InsForge CLI and agent skills.

> This is the canonical agent document. It is served identically at
> `/agents.md`, `/skill.md`, and `/auth.md`.

## Authentication

Using InsForge requires an InsForge account. An agent gets a credential one of
two ways. Always run the CLI via `npx`; never install it globally.

### Autonomous registration (ID-JAG)

If your agent runs inside a participating provider that can mint a WorkOS ID-JAG
(an identity assertion carrying the user's verified email), it can register with
no human sign-up form and receive an InsForge CLI credential directly. Discover,
register, then use it.

**1. Discover.** Fetch the protected-resource metadata, then the
authorization-server metadata it references:

```http
GET https://api.insforge.dev/.well-known/oauth-protected-resource
GET https://api.insforge.dev/.well-known/oauth-authorization-server
```

Use the `resource` value as the `aud` when minting the ID-JAG. The `agent_auth`
block lists the supported method: `identity_assertion` with an `id-jag`
assertion, credential type `api_key`.

**2. Get consent, then register.** First confirm the user consents to assert
their identity to InsForge, using the `resource_name`, `resource_logo_uri`, and
scopes from discovery. Then have the provider mint a WorkOS ID-JAG with `iss`
`https://auth.workos.bot`, `typ` `oauth-id-jag+jwt`, alg `RS256`, `aud` set to
the `resource` above, a stable `sub`, the user's `email` with
`email_verified: true`, a fresh `jti`, and a near-term `exp` (about 5 minutes).
Post it:

```http
POST https://api.insforge.dev/agent/auth
Content-Type: application/json

{
  "type": "identity_assertion",
  "assertion_type": "urn:ietf:params:oauth:token-type:id-jag",
  "assertion": "<ID-JAG JWT>",
  "requested_credential_type": "api_key"
}
```

InsForge verifies the assertion against the provider's published keys, matches or
creates the user by verified email, and returns a `uak_` user API key (the same
credential a CLI login issues). Errors use OAuth-style
`{ "error": "<code>", "error_description": "<details>" }`.

**3. Use it.** Log the CLI in with that key (the `uak_…` value from step 2),
then work as the user:

```bash
npx @insforge/cli login --user-api-key uak_xxxxxxxx
npx @insforge/cli link --project-id <id>   # link the current directory to a project
npx @insforge/cli whoami     # verify
```

Autonomous registration is in preview. Only agents whose provider participates
(it signs the ID-JAG) can use it; every other agent uses the login below.

### Device flow (sandboxes / no local browser)

If you run where the browser can't reach the CLI's local callback (the ChatGPT
app, SSH, containers), drive the RFC 8628 device flow: the user approves a short
code in their browser and you receive a scoped OAuth `access_token`. Easiest is
`npx @insforge/cli login --device` (the CLI stores the credential). To drive the
endpoints yourself:

**1. Request a device code** (public InsForge CLI client, no secret):

```http
POST https://api.insforge.dev/api/oauth/v1/device_authorization
Content-Type: application/x-www-form-urlencoded

client_id=clf_NK8cMUs41gm8ZcfdtSguVw&scope=user:read%20organizations:read%20projects:read%20projects:write
```

These are the four scopes this client supports. `projects:read projects:write`
alone is enough to create a project (a new user gets a personal organization
automatically); `user:read` lets you call `whoami` to confirm the account.
Request only the ones you need.

**2. Have the user approve.** Show them `verification_uri_complete`; they sign in
(Google or GitHub is fastest — that email is verified immediately) and click
Approve. Then poll, honoring `interval`:

```http
POST https://api.insforge.dev/api/oauth/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=<device_code>&client_id=clf_NK8cMUs41gm8ZcfdtSguVw
```

`400 { "error": "authorization_pending" }` while waiting; `200 { access_token, ... }` once approved.

**3. Use it.** Hand the token to the CLI, then provision a project:

```bash
export INSFORGE_ACCESS_TOKEN=<access_token>
npx @insforge/cli create
npx @insforge/cli whoami     # confirm identity via the API, not `current`
```

### CLI login

Sign in once through the CLI, then link a project:

```bash
npx @insforge/cli login      # sign in
npx @insforge/cli link --project-id <id>   # link the current directory to a project
npx @insforge/cli whoami     # verify
```

## How to use InsForge

Drive InsForge from your coding agent with the **CLI + agent skills**. After
`login` + `link`, the CLI installs the official InsForge agent skills, so the
commands (`db`, `storage`, `functions`, `deployments deploy`, ...) come with guidance. Run
`npx @insforge/cli metadata` to discover what a project has configured.

- Official skills (source): https://github.com/InsForge/insforge-skills
- Skills on skills.sh: https://skills.sh/insforge

For application code, install the SDK:

```bash
npm install @insforge/sdk
```

## Resources

- Documentation: https://docs.insforge.dev
- AI-discovery index: https://insforge.dev/llms.txt
- Pricing (machine-readable): https://insforge.dev/pricing.md
- CLI: https://www.npmjs.com/package/@insforge/cli
- SDK: https://www.npmjs.com/package/@insforge/sdk
- GitHub (monorepo): https://github.com/InsForge/InsForge
- Community (Discord): https://discord.gg/DvBtaEc9Jz

