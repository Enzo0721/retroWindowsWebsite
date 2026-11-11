import type { Project } from './projects'
import {
  formatListing,
  getNode,
  listDir,
  resolvePath,
  type FsNode,
} from './vfs'

export type ShellAction =
  | { type: 'print'; text: string }
  | { type: 'clear' }
  | { type: 'open-url'; url: string; text?: string }
  | { type: 'open-window'; id: 'about' | 'projects'; text?: string }
  | { type: 'exit' }

const HELP = `Commands:
  ls [path]      list files
  cd [path]      change directory
  cat <file>     print a file
  pwd            print working directory
  open <target>  open a project, window, or link
  clear          clear the screen
  help           show this help
  whoami         who is logged in
  history        command history

Tab completes commands and paths. Up/down arrows cycle history.`

const NEOFETCH = `  ┌──────────┐
  │  KayaOS  │   kaya@os
  │   ░░░░   │   --------
  │  ■    ■  │   OS: KayaOS 95
  │    ▄▄    │   Host: desktop
  └────┬┬────┘   Shell: ksh
       ▔▔        Uptime: since 1995`

const WINVER = `KayaOS [Version 4.00.950]
Copyright (C) 1995-2026 Kaya`

const COMMANDS = [
  'ls',
  'cd',
  'cat',
  'pwd',
  'open',
  'clear',
  'help',
  'whoami',
  'history',
  'exit',
  'cls',
  'dir',
  'neofetch',
  'winver',
]

export class Shell {
  cwd = '/'
  history: string[] = []
  private root: FsNode
  private projects: Project[]

  constructor(root: FsNode, projects: Project[]) {
    this.root = root
    this.projects = projects
  }

  exec(line: string): ShellAction[] {
    const trimmed = line.trim()
    if (trimmed) this.history.push(trimmed)
    if (!trimmed) return []

    const tokens = tokenize(trimmed)
    const [cmd, ...args] = tokens
    return this.run(cmd, args, trimmed)
  }

  complete(input: string): { value: string; listing?: string } {
    const parts = input.split(/(\s+)/)
    const last = parts[parts.length - 1] ?? ''
    const isFirst = parts.filter((p) => p.trim()).length <= 1 && !input.endsWith(' ')

    if (isFirst) {
      const matches = COMMANDS.filter((c) => c.startsWith(last))
      if (matches.length === 1) {
        return { value: matches[0] + ' ' }
      }
      if (matches.length > 1) {
        return { value: commonPrefix(matches), listing: matches.join('  ') }
      }
      return { value: input }
    }

    const cmd = input.trimStart().split(/\s+/)[0]
    if (!['cd', 'cat', 'ls', 'open'].includes(cmd)) return { value: input }

    const matches = this.pathMatches(last)
    if (matches.length === 1) {
      const prefix = input.slice(0, input.length - last.length)
      const match = matches[0]
      return { value: prefix + match }
    }
    if (matches.length > 1) {
      const prefix = input.slice(0, input.length - last.length)
      return {
        value: prefix + commonPrefix(matches),
        listing: matches.join('  '),
      }
    }
    return { value: input }
  }

  private pathMatches(partial: string): string[] {
    const cut = partial.lastIndexOf('/')
    const dirPart = cut === -1 ? '' : partial.slice(0, cut + 1)
    const namePart = cut === -1 ? partial : partial.slice(cut + 1)
    const dirPath = resolvePath(this.cwd, dirPart === '' ? '.' : dirPart)
    const entries = listDir(this.root, dirPath, namePart.startsWith('.'))
    if (!entries) return []
    return entries
      .filter((entry) => entry.name.startsWith(namePart))
      .map((entry) => {
        const suffix = entry.kind === 'dir' ? '/' : ''
        return dirPart + entry.name + suffix
      })
  }

  private run(cmd: string, args: string[], raw: string): ShellAction[] {
    switch (cmd) {
      case 'help':
        return [{ type: 'print', text: HELP }]
      case 'clear':
      case 'cls':
        return [{ type: 'clear' }]
      case 'pwd':
        return [{ type: 'print', text: this.cwd }]
      case 'whoami':
        return [{ type: 'print', text: 'kaya' }]
      case 'history':
        return [
          {
            type: 'print',
            text: this.history.map((h, i) => `${String(i + 1).padStart(4, ' ')}  ${h}`).join('\n'),
          },
        ]
      case 'exit':
        return [{ type: 'exit' }]
      case 'ls':
      case 'dir':
        return this.ls(args)
      case 'cd':
        return this.cd(args[0])
      case 'cat':
        return this.cat(args)
      case 'open':
        return this.open(args)
      case 'neofetch':
        return [{ type: 'print', text: NEOFETCH }]
      case 'winver':
        return [{ type: 'print', text: WINVER }]
      case 'sudo':
        return [{ type: 'print', text: 'kaya is already the administrator.' }]
      case 'uname':
        return [{ type: 'print', text: 'KayaOS' }]
      case 'rm':
        if (args.includes('-rf') && (args.includes('/') || args.includes('*') || args.length === 1)) {
          return [{ type: 'print', text: "refusing to remove '/'." }]
        }
        return [{ type: 'print', text: `rm: not permitted` }]
      default:
        if (/^rm\s+-rf/.test(raw)) {
          return [{ type: 'print', text: "refusing to remove '/'." }]
        }
        return [{ type: 'print', text: `${cmd}: command not found` }]
    }
  }

  private ls(args: string[]): ShellAction[] {
    const flags = args.filter((a) => a.startsWith('-')).join('')
    const pathArg = args.find((a) => !a.startsWith('-'))
    const all = flags.includes('a')
    const long = flags.includes('l')
    const path = resolvePath(this.cwd, pathArg ?? '.')
    const node = getNode(this.root, path)
    if (!node) return [{ type: 'print', text: `ls: ${pathArg ?? path}: No such file or directory` }]
    if (node.kind !== 'dir') {
      return [{ type: 'print', text: long ? `-  ${node.name}` : node.name }]
    }
    const entries = listDir(this.root, path, all) ?? []
    const text = formatListing(entries, long)
    return text ? [{ type: 'print', text }] : []
  }

  private cd(pathArg?: string): ShellAction[] {
    const path = resolvePath(this.cwd, pathArg ?? '/')
    const node = getNode(this.root, path)
    if (!node) return [{ type: 'print', text: `cd: ${pathArg}: No such file or directory` }]
    if (node.kind !== 'dir') return [{ type: 'print', text: `cd: ${pathArg}: Not a directory` }]
    this.cwd = path
    return []
  }

  private cat(args: string[]): ShellAction[] {
    if (args.length === 0) return [{ type: 'print', text: 'cat: missing file' }]
    const lines: string[] = []
    for (const arg of args) {
      const path = resolvePath(this.cwd, arg)
      const node = getNode(this.root, path)
      if (!node) {
        lines.push(`cat: ${arg}: No such file or directory`)
        continue
      }
      if (node.kind === 'dir') {
        lines.push(`cat: ${arg}: Is a directory`)
        continue
      }
      lines.push((node.content ?? '').replace(/\n$/, ''))
    }
    return [{ type: 'print', text: lines.join('\n') }]
  }

  private open(args: string[]): ShellAction[] {
    if (args.length === 0) return [{ type: 'print', text: 'open: missing operand' }]
    const target = args[0]
    if (/^https?:\/\//i.test(target)) {
      return [{ type: 'open-url', url: target }]
    }

    const path = resolvePath(this.cwd, target)
    const node = getNode(this.root, path)
    if (!node) {
      const project = this.findProject(target)
      if (project) return this.openProject(project)
      if (target === 'about') return [{ type: 'open-window', id: 'about' }]
      if (target === 'projects') return [{ type: 'open-window', id: 'projects' }]
      if (target === 'lab') return [{ type: 'open-url', url: 'https://lab.kayaergin.com' }]
      return [{ type: 'print', text: `open: ${target}: No such file or directory` }]
    }

    if (node.kind === 'link' && node.href) {
      return [{ type: 'open-url', url: node.href }]
    }
    if (node.kind === 'dir') {
      if (node.name === 'projects' || path === '/projects') {
        return [{ type: 'open-window', id: 'projects' }]
      }
      return [{ type: 'print', text: `open: ${target}: Is a directory` }]
    }
    if (node.name === 'about.txt') {
      return [{ type: 'open-window', id: 'about' }]
    }
    if (node.name.endsWith('.md')) {
      const slug = node.name.replace(/\.md$/, '')
      const project = this.projects.find((p) => p.slug === slug)
      if (project) return this.openProject(project)
    }
    return [{ type: 'print', text: `open: nothing to open for '${target}'` }]
  }

  private findProject(query: string): Project | undefined {
    const q = query.toLowerCase().replace(/\.md$/, '')
    return this.projects.find(
      (p) => p.slug.toLowerCase() === q || p.title.toLowerCase() === q,
    )
  }

  private openProject(project: Project): ShellAction[] {
    const url = project.url || project.github
    if (url) return [{ type: 'open-url', url, text: `opening ${project.title}` }]
    return [{ type: 'open-window', id: 'projects', text: project.title }]
  }
}

function tokenize(line: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (const ch of line) {
    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (current) tokens.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current) tokens.push(current)
  return tokens
}

function commonPrefix(items: string[]): string {
  if (items.length === 0) return ''
  let prefix = items[0]
  for (const item of items.slice(1)) {
    let i = 0
    while (i < prefix.length && i < item.length && prefix[i] === item[i]) i += 1
    prefix = prefix.slice(0, i)
  }
  return prefix
}
