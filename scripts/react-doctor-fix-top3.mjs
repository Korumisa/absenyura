import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const resultsDir =
  'C:\\Users\\shink\\AppData\\Local\\Temp\\react-doctor-f3ca3d6c-1f40-43b2-9f2b-006d758a90e3'

function usage() {
  console.error(
    'Usage: node scripts/react-doctor-fix-top3.mjs <size-axes|pure-function> [--dry-run]'
  )
  process.exit(1)
}

const mode = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
if (!mode || !['size-axes', 'pure-function'].includes(mode)) usage()

const ruleFileByMode = {
  'size-axes': 'react-doctor--design-no-redundant-size-axes.txt',
  'pure-function': 'react-doctor--prefer-module-scope-pure-function.txt',
}

function parseRuleFile(ruleText) {
  const map = new Map()
  for (const line of ruleText.split(/\r?\n/)) {
    const m = line.match(/^\s+(src\/.+?\.(?:ts|tsx|js|jsx)):(\d+)\s*$/)
    if (!m) continue
    const file = m[1]
    const lineNumber = Number(m[2])
    if (!Number.isFinite(lineNumber)) continue
    if (!map.has(file)) map.set(file, new Set())
    map.get(file).add(lineNumber)
  }
  return map
}

function getTsScriptKind(filePath) {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (filePath.endsWith('.ts')) return ts.ScriptKind.TS
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX
  return ts.ScriptKind.JS
}

function collapseSizeAxesInTokenList(tokens) {
  const width = new Map()
  const height = new Map()
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (!t) continue
    if (t.includes(':')) continue
    const neg = t.startsWith('-')
    const core = neg ? t.slice(1) : t
    if (core.startsWith('w-')) width.set((neg ? '-' : '') + core.slice(2), i)
    if (core.startsWith('h-')) height.set((neg ? '-' : '') + core.slice(2), i)
  }

  const planned = []
  for (const [val, wIndex] of width.entries()) {
    const hIndex = height.get(val)
    if (hIndex === undefined) continue
    const cleanVal = val.startsWith('-') ? val.slice(1) : val
    if (cleanVal.includes('/')) continue
    const sizeToken = val.startsWith('-') ? `-size-${cleanVal}` : `size-${cleanVal}`
    planned.push({ wIndex, hIndex, sizeToken })
  }

  if (planned.length === 0) return tokens

  planned.sort((a, b) => Math.min(b.wIndex, b.hIndex) - Math.min(a.wIndex, a.hIndex))
  const out = tokens.slice()
  for (const { wIndex, hIndex, sizeToken } of planned) {
    const keepIndex = Math.min(wIndex, hIndex)
    const dropIndex = Math.max(wIndex, hIndex)
    out[keepIndex] = sizeToken
    out[dropIndex] = ''
  }
  return out.filter(Boolean)
}

function collapseSizeAxesInStringLiteralText(text) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const nextTokens = collapseSizeAxesInTokenList(tokens)
  if (nextTokens.join(' ') === tokens.join(' ')) return null
  return nextTokens.join(' ')
}

function createEditsForSizeAxes(sourceFile, flaggedLines) {
  const edits = []
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
      let intersects = false
      for (const l of flaggedLines) {
        if (l >= startLine && l <= endLine) {
          intersects = true
          break
        }
      }
      if (intersects) {
        const nextText = collapseSizeAxesInStringLiteralText(node.text)
        if (nextText !== null) {
          if (ts.isStringLiteral(node)) {
            const fullStart = node.getStart(sourceFile)
            const fullEnd = node.getEnd()
            const raw = sourceFile.text.slice(fullStart, fullEnd)
            const quote = raw[0] === "'" ? "'" : '"'
            const escaped = nextText.replaceAll(quote, `\\${quote}`)
            edits.push({ start: fullStart, end: fullEnd, text: `${quote}${escaped}${quote}` })
          } else {
            const fullStart = node.getStart(sourceFile)
            const fullEnd = node.getEnd()
            const escaped = nextText.replaceAll('`', '\\`')
            edits.push({ start: fullStart, end: fullEnd, text: `\`${escaped}\`` })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return edits
}

function findStatementAtLine(sourceFile, lineNumber) {
  let found = null
  function visit(node) {
    if (found) return
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
    if (startLine !== lineNumber) {
      ts.forEachChild(node, visit)
      return
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue
        if (!decl.initializer) continue
        if (
          ts.isArrowFunction(decl.initializer) ||
          ts.isFunctionExpression(decl.initializer) ||
          ts.isFunctionDeclaration(decl.initializer)
        ) {
          found = node
          return
        }
      }
    }

    if (ts.isFunctionDeclaration(node) && node.name && !ts.isIdentifier(node.name)) {
      return
    }
  }
  visit(sourceFile)
  return found
}

function statementIsInFunctionBody(statement) {
  const p = statement.parent
  if (!p || !ts.isSourceFile(p) && !ts.isBlock(p)) return false
  if (!ts.isBlock(p)) return false
  const pp = p.parent
  return (
    !!pp &&
    (ts.isFunctionDeclaration(pp) ||
      ts.isFunctionExpression(pp) ||
      ts.isArrowFunction(pp) ||
      ts.isMethodDeclaration(pp))
  )
}

function findModuleInsertPos(sourceFile) {
  const imports = sourceFile.statements.filter((s) => ts.isImportDeclaration(s) || ts.isImportEqualsDeclaration(s))
  if (imports.length === 0) return 0
  const last = imports[imports.length - 1]
  return last.getEnd()
}

function expandRemovalRange(text, start, end) {
  let s = start
  let e = end
  while (s > 0 && (text[s - 1] === ' ' || text[s - 1] === '\t')) s--
  while (e < text.length && (text[e] === '\r' || text[e] === '\n')) {
    if (text[e] === '\r' && text[e + 1] === '\n') {
      e += 2
      break
    }
    e++
    if (text[e - 1] === '\n') break
  }
  return { start: s, end: e }
}

function createEditsForPureFunctionHoist(sourceFile, flaggedLines) {
  const edits = []
  const hoisted = []
  const existingTopLevelNames = new Set()
  for (const st of sourceFile.statements) {
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) existingTopLevelNames.add(d.name.text)
      }
    } else if (ts.isFunctionDeclaration(st) && st.name) {
      existingTopLevelNames.add(st.name.text)
    }
  }

  const removalRanges = []
  for (const lineNumber of flaggedLines) {
    const st = findStatementAtLine(sourceFile, lineNumber)
    if (!st) continue
    if (!statementIsInFunctionBody(st)) continue

    if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue
        if (existingTopLevelNames.has(decl.name.text)) {
          throw new Error(`Refusing to hoist ${decl.name.text}: already exists at module scope`)
        }
      }
    }
    if (ts.isFunctionDeclaration(st) && st.name) {
      if (existingTopLevelNames.has(st.name.text)) {
        throw new Error(`Refusing to hoist ${st.name.text}: already exists at module scope`)
      }
    }

    const raw = sourceFile.text.slice(st.getStart(sourceFile), st.getEnd())
    hoisted.push(raw.trim())
    removalRanges.push(expandRemovalRange(sourceFile.text, st.getStart(sourceFile), st.getEnd()))
  }

  const uniqueHoisted = Array.from(new Set(hoisted)).filter(Boolean)
  if (uniqueHoisted.length === 0) return { edits: [], removedRanges: [] }

  const insertPos = findModuleInsertPos(sourceFile)
  edits.push({
    start: insertPos,
    end: insertPos,
    text: `\n\n${uniqueHoisted.join('\n\n')}\n`,
  })

  for (const r of removalRanges) edits.push({ start: r.start, end: r.end, text: '' })
  return { edits, removedRanges: removalRanges }
}

function filterEditsAgainstRemovals(edits, removalRanges) {
  if (removalRanges.length === 0) return edits
  return edits.filter((e) => {
    for (const r of removalRanges) {
      if (e.start >= r.start && e.end <= r.end) return false
      const overlaps = e.start < r.end && e.end > r.start
      if (overlaps) {
        throw new Error('Overlapping edits detected')
      }
    }
    return true
  })
}

function applyEdits(text, edits) {
  const sorted = edits.slice().sort((a, b) => b.start - a.start)
  let out = text
  for (const e of sorted) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  return out
}

const ruleFilePath = path.join(resultsDir, ruleFileByMode[mode])
const ruleText = await fs.readFile(ruleFilePath, 'utf8')
const flaggedByFile = parseRuleFile(ruleText)

let changedFiles = 0
let touchedEdits = 0

for (const [relFile, lineSet] of flaggedByFile.entries()) {
  const absFile = path.join(projectRoot, relFile)
  const original = await fs.readFile(absFile, 'utf8')
  const scriptKind = getTsScriptKind(absFile)
  const sourceFile = ts.createSourceFile(absFile, original, ts.ScriptTarget.Latest, true, scriptKind)
  const flaggedLines = Array.from(lineSet.values()).sort((a, b) => a - b)

  let edits = []
  let removalRanges = []
  if (mode === 'size-axes') {
    edits = createEditsForSizeAxes(sourceFile, flaggedLines)
  } else if (mode === 'pure-function') {
    const r = createEditsForPureFunctionHoist(sourceFile, flaggedLines)
    edits = r.edits
    removalRanges = r.removedRanges
  }

  edits = filterEditsAgainstRemovals(edits, removalRanges)
  if (edits.length === 0) continue
  const next = applyEdits(original, edits)
  if (next === original) continue
  touchedEdits += edits.length
  changedFiles++
  if (!dryRun) await fs.writeFile(absFile, next, 'utf8')
}

console.log(
  JSON.stringify(
    { mode, dryRun, changedFiles, touchedEdits, ruleFilePath },
    null,
    2
  )
)
