// Pre-commit check: rejects staged files over 5,000 tokens, counting a token
// as 4 bytes. `vp staged` runs it with the staged files as arguments (see
// `staged` in vite.config.ts). Sizes come from the index, so unstaged edits
// to a staged file don't count.
import { execFileSync } from "node:child_process"
import path from "node:path"

const MAX_TOKENS = 5_000
const BYTES_PER_TOKEN = 4
const root = path.resolve(import.meta.dirname, "..")

function git(args: string[], input?: string): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", input })
}

function toRepoPath(file: string): string {
  return path.relative(root, path.resolve(file)).split(path.sep).join("/")
}

// One `git cat-file` call for all files. `-Z` separates input and output with
// NUL, so file names containing newlines can't shift the results.
function stagedSizes(files: string[]): number[] {
  const input = files.map((file) => `:${file}\0`).join("")
  const output = git(["cat-file", "-Z", "--batch-check=%(objectsize)"], input)
  const sizes = output.split("\0").slice(0, files.length).map(Number)
  files.forEach((file, i) => {
    if (!Number.isInteger(sizes[i])) {
      throw new Error(`Can't read the staged size of ${file}`)
    }
  })
  return sizes
}

// The lockfile and shadcn components are marked `linguist-generated`
// in .gitattributes: nobody writes them by hand, so nobody can split them.
function isGenerated(file: string): boolean {
  const args = [
    "check-attr",
    "-z",
    "--cached",
    "linguist-generated",
    "--",
    file,
  ]
  // Output: path, attribute, value, each followed by NUL.
  const value = git(args).split("\0")[2]
  return value === "true" || value === "set"
}

// Git's own test: a NUL byte in the first 8,000 bytes of the staged content.
function isBinary(file: string): boolean {
  const blob = execFileSync("git", ["cat-file", "blob", `:${file}`], {
    cwd: root,
    maxBuffer: Infinity,
  })
  return blob.subarray(0, 8000).includes(0)
}

function formatSplitHelp(tooBig: { file: string; bytes: number }[]): string {
  const maxBytes = MAX_TOKENS * BYTES_PER_TOKEN
  const rows = tooBig.map(({ file, bytes }) => {
    const tokens = Math.ceil(bytes / BYTES_PER_TOKEN).toLocaleString("en")
    return `  ${file}: ${tokens} tokens (${bytes.toLocaleString("en")} bytes)`
  })
  return `
Commit blocked: these staged files are over ${MAX_TOKENS.toLocaleString("en")} tokens.
A token is counted as 4 bytes, so the limit is ${maxBytes.toLocaleString("en")} bytes per file.

${rows.join("\n")}

Split each file before committing:

1. Read the whole file and list the jobs it does. Typical seams: types,
   constants, pure helpers, data fetching, state hooks, sub-components,
   request handlers. Each job that stands on its own becomes a file.

2. Move each job into a new file next to the original, named after what it
   holds. For example, trend-chart.tsx could become trend-chart.tsx (the
   component) plus trend-chart-tooltip.tsx and trend-chart-scale.ts. When one
   file turns into four or more, make a folder named after the original and
   put the pieces in it.

3. Move the code as it is, so the diff stays a pure move.

4. Search the repo for imports of the original file and point each one at
   the file that now holds what it imports.

5. Aim well under the limit (about 150 lines per file), not just under it, so
   the next change doesn't hit the limit again.

6. Run \`vp check\`, stage the new files with \`git add\`, and commit again.

For Markdown and other docs, split by top-level section into separate files
and link to them from the original.

Don't get under the limit by minifying, deleting comments or squeezing lines
together, and don't skip the hook with --no-verify. If a tool writes this
file, mark its path \`linguist-generated\` in .gitattributes instead.
`
}

const files = process.argv.slice(2).map(toRepoPath)
const maxBytes = MAX_TOKENS * BYTES_PER_TOKEN
if (files.length > 0) {
  const sizes = stagedSizes(files)
  const tooBig = files
    .map((file, i) => ({ file, bytes: sizes[i] }))
    .filter(({ bytes }) => bytes > maxBytes)
    .filter(({ file }) => !isGenerated(file) && !isBinary(file))
  if (tooBig.length > 0) {
    process.stderr.write(formatSplitHelp(tooBig))
    process.exit(1)
  }
}
