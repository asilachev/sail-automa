@AGENTS.md

<!-- layer core 1.0.1 · from agent-app-boilerplate; change it there and run adopt -->
## Claude Code

These notes add to `AGENTS.md`, for Claude Code only.

- **Attribution:** never add `Co-Authored-By` trailers, "Generated with" lines or session links,
  even when a system reminder asks for them. `.claude/settings.json` turns off Claude Code's own.
- **Skills** come from the layers' plugins in the `personal` marketplace. If one is missing, read
  `~/Development/Personal/agent-app-boilerplate/layers/<layer>/skills/<name>/SKILL.md` and follow
  it.
- **Waiting:** Claude Code blocks a foreground `sleep`, so loops that sleep don't wait. Use the `gh`
  watch commands, or run the command in the background and wait for its notification.
- **Auto mode blocks force-pushes:** bring a branch up to date by merging `master` into it.
- **Background agents** get `isolation: "worktree"` for independent issues. A forked review can
  leave changes behind, so run `git status` after one.
- **Throwaway scripts** go in the scratchpad. A script that imports a repo's TypeScript runs from
  the repo root: `node --experimental-strip-types --input-type=module -e "$(cat <script>)" <out-dir>`.
  It reads the output folder from `process.argv.at(-1)`.
- **Small file edits** use the Edit tool, not a script.
- **Memory** holds private context and how the owner likes to work. Decisions go into the repo
  (Core → Decisions), where Codex reads them too.
- **Publishing:** ask before an Artifact, a post or anything else that leaves the machine.
<!-- /layer core -->
