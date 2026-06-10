<!-- codex-project-ops-workflow: initialized -->
<!-- initialized-at: 2026-06-10 19:00:00 +08:00 -->

# Codex Ops Workflow

Initialization status: initialized
Project: Onovich
Repository root: <PROJECT_ROOT>
Machine config: `.codex/project-ops-workflow.json`
Skill: project-ops-workflow

Treat this document and `.codex/project-ops-workflow.json` as the source of truth for repeatable project operations. The goal is to keep routine validation token-light and deterministic while the site refactor continues.

## Global Wrappers

Run these from the repository root:

```powershell
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\EnvCheck.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\RestoreDeps.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\InstallDeps.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Build.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Test.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
<USER_HOME>\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

## Common Commands

`Validate.cmd` runs:

```powershell
npm --prefix site run build
npm --prefix site run assets:check
```

`Build.cmd` runs the Astro build. The build includes `prebuild`, so `cms:check` runs first.

`Test.cmd` runs the CMS logic check directly:

```powershell
npm --prefix site run cms:check
```

`Smoke.cmd` assumes the local static preview is available at `http://127.0.0.1:4351` and runs:

```powershell
npm --prefix site run visual:guard -- --clone=http://127.0.0.1:4351
```

It also performs a simple HTTP GET against the preview root.

## Dev Server

Use `StartDevServer.cmd` only when no suitable preview is already running on port `4351`.

Start command:

```powershell
npm --prefix site run preview -- --host 127.0.0.1 --port 4351
```

Health URL: `http://127.0.0.1:4351/`
Ready text: `Onovich`

Use `StopDevServer.cmd` only for a preview process started by `StartDevServer.cmd`; it relies on `.codex/project-ops-devserver.pid`.

## Safety Policy

Do not run destructive clean/reset/deploy commands unless the user explicitly asks.
