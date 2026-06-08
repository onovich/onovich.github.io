<!-- codex-project-git-workflow: initialized -->
<!-- initialized-at: 2026-06-09 04:58:26 +08:00 -->

# Codex Git Workflow

Initialization status: initialized
Project: Onovich
Repository root: <PROJECT_ROOT>
Machine config: `
.codex\project-git-workflow.json
`
Skill: project-git-workflow

Treat this document and the machine config as the source of truth for this repository's Codex git workflow. Do not replace them with generic defaults unless the user explicitly asks to reinitialize or update the policy.

## Global Wrappers

Run these from the repository root:

```
powershell
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\Status.cmd
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\Validate.cmd
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\Commit.cmd -Message "commit message" -Paths path\to\file,other\file
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "commit message" -Paths path\to\file,other\file
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\Push.cmd
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\Stash.cmd -StashMessage "reason"
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\StashPop.cmd
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\Ignore.cmd -Pattern build-output/
<USER_HOME>\.codex\skills\project-git-workflow\scripts\git\DiscardPaths.cmd -ConfirmDangerous -Paths path\to\file
```

## Status

```
powershell
git -c safe.directory=<PROJECT_ROOT> status --short --branch
```

## Validation

Run these before commit or push, in order:

No validation commands were configured. Ask before committing or pushing if validation matters for this repo.
## Staging Policy

ask each time

Inspect status before staging. Preserve unrelated user changes unless the user explicitly asks to include them.

## Commit

Use the global wrapper's built-in git commit after staging according to policy. Prefer concise conventional commit messages unless the user specifies another message.

## Push

```
powershell
git -c safe.directory=<PROJECT_ROOT> push -u origin HEAD
```

## Docs And TODO

None configured.

## Safety And Branch Policy

No extra policy configured. Destructive git commands still require explicit user approval.
