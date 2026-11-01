#!/usr/bin/env node
/**
 * Preflight shared by CI and by hand before tagging.
 *
 * The failure this guards against is a rename that lands in only half the
 * files: the browser module id, the bundle patch and the manifest must all
 * name the same package, or the client half silently never loads.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const passed = []

/** @param {string} label - what is being asserted. @param {() => unknown} run - throws on failure. */
function check(label, run) {
  try {
    run()
    passed.push(label)
  } catch (error) {
    failures.push(`${label}: ${error.message}`)
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const client = readFileSync(join(root, 'client.js'), 'utf8')

check('client module id matches the package name', () => {
  const match = /\bid:\s*'([^']+)'/.exec(client)
  if (!match) throw new Error('client.js has no id: <string> module registration')
  if (match[1] !== pkg.name) throw new Error(`client.js registers "${match[1]}", package is "${pkg.name}"`)
})

check('bundle patch names the package', () => {
  const patchPath = resolve(root, pkg.dsh?.bundle?.patch ?? '')
  if (!pkg.dsh?.bundle?.patch) throw new Error('package.json has no dsh.bundle.patch')
  if (!statSync(patchPath).isFile()) throw new Error(`${pkg.dsh.bundle.patch} is not a file`)
  const patch = readFileSync(patchPath, 'utf8')
  if (!patch.includes(`'${pkg.name}'`) && !patch.includes(`"${pkg.name}"`)) {
    throw new Error(`${pkg.dsh.bundle.patch} never names ${pkg.name}`)
  }
})

check('dsh.client.platform is web', () => {
  if (pkg.dsh?.client?.platform !== 'web') throw new Error('dsh.client.platform must be "web"')
})

/** Expand the one wildcard form this project uses: `dir/*.ext`. */
function expand(entry) {
  if (!entry.includes('*')) {
    if (!existsSync(resolve(root, entry))) throw new Error(`${entry} is missing`)
    return [entry]
  }
  const dir = dirname(entry)
  const pattern = basename(entry)
  const matcher = new RegExp('^' + pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
  if (!existsSync(resolve(root, dir))) throw new Error(`${dir} is missing`)
  const hits = readdirSync(resolve(root, dir)).filter((name) => matcher.test(name))
  if (hits.length === 0) throw new Error(`${entry} matches nothing`)
  return hits.map((name) => join(dir, name))
}

check('every entry in files exists', () => {
  if (!Array.isArray(pkg.files) || pkg.files.length === 0) throw new Error('package.json lists no files')
  for (const entry of pkg.files) expand(entry)
})

check('every export resolves', () => {
  for (const [key, target] of Object.entries(pkg.exports ?? {})) {
    const value = typeof target === 'string' ? target : target?.default
    if (typeof value !== 'string') throw new Error(`export ${key} is not a path`)
    expand(value.replace(/^\.\//, ''))
  }
  if (pkg.exports?.['.'] === undefined || pkg.exports?.['./client'] === undefined) {
    throw new Error('exports must expose "." and "./client"')
  }
})

check('locale files carry display metadata', () => {
  const dir = join(root, 'locale')
  const files = readdirSync(dir).filter((name) => name.endsWith('.json'))
  if (files.length === 0) throw new Error('locale/ has no json files')
  for (const name of files) {
    const dict = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    if (!dict.meta?.title) throw new Error(`locale/${name} has no meta.title`)
    if (!dict.meta?.description) throw new Error(`locale/${name} has no meta.description`)
    if (!dict.nav) throw new Error(`locale/${name} has no nav label`)
  }
})

check('client.js parses', () => {
  execFileSync(process.execPath, ['--check', 'client.js'], { cwd: root, stdio: 'pipe' })
})

check('icon is a small SVG', () => {
  const icon = pkg.exports?.['./icon'] ?? './icon.svg'
  const path = resolve(root, String(icon).replace(/^\.\//, ''))
  const size = statSync(path).size
  if (size > 256 * 1024) throw new Error(`icon is ${size} bytes, over the 256 KiB limit`)
  if (!readFileSync(path, 'utf8').includes('<svg')) throw new Error('icon is not an SVG document')
})

const host = await import(pathToFileURL(join(root, 'index.js')).href)
check('host half exports apply()', () => {
  if (typeof host.apply !== 'function') throw new Error('index.js does not export apply')
  if (!Array.isArray(host.inject)) throw new Error('index.js does not export an inject array')
})

for (const label of passed) console.log(`  ok   ${label}`)
for (const failure of failures) console.error(`  fail ${failure}`)
console.log(`\n${passed.length} passed, ${failures.length} failed`)
process.exit(failures.length === 0 ? 0 : 1)
