import type { Project } from './projects'

export type FsKind = 'dir' | 'file' | 'link'

export type FsNode = {
  name: string
  kind: FsKind
  hidden?: boolean
  content?: string
  href?: string
  children?: Record<string, FsNode>
}

export const ABOUT_TEXT = `Kaya
Founding Engineer at VoltLayer. Previously at Toozy.

GitHub: https://github.com/Enzo0721
LinkedIn: https://www.linkedin.com/in/kaya-ergin-8410011b5
Email: kayajergin@gmail.com
`

export const LAB_URL = 'https://lab.kayaergin.com'

function dir(name: string, children: Record<string, FsNode>, hidden = false): FsNode {
  return { name, kind: 'dir', children, hidden }
}

function file(name: string, content: string, hidden = false): FsNode {
  return { name, kind: 'file', content, hidden }
}

function link(name: string, href: string): FsNode {
  return { name, kind: 'link', href, content: href }
}

export function createVfs(projects: Project[]): FsNode {
  const projectFiles: Record<string, FsNode> = {}
  for (const project of projects) {
    const name = `${project.slug}.md`
    projectFiles[name] = file(name, project.raw)
  }
  return dir('/', {
    'about.txt': file('about.txt', ABOUT_TEXT.trim() + '\n'),
    lab: link('lab', LAB_URL),
    projects: dir('projects', projectFiles),
    '.secrets': file(
      '.secrets',
      'Nothing here. Try the homelab instead.\n',
      true,
    ),
  })
}

export function normalizePath(path: string): string {
  const parts: string[] = []
  const absolute = path.startsWith('/')
  const segments = path.split('/')
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      if (parts.length) parts.pop()
      continue
    }
    parts.push(seg)
  }
  if (!absolute && parts.length === 0) return '.'
  return '/' + parts.join('/')
}

export function resolvePath(cwd: string, path: string): string {
  if (!path) return cwd
  if (path.startsWith('/')) return normalizePath(path)
  if (path === '~') return '/'
  if (path.startsWith('~/')) return normalizePath('/' + path.slice(2))
  const base = cwd === '/' ? '' : cwd
  return normalizePath(base + '/' + path)
}

export function getNode(root: FsNode, path: string): FsNode | undefined {
  const normalized = normalizePath(path)
  if (normalized === '/') return root
  const parts = normalized.split('/').filter(Boolean)
  let node: FsNode | undefined = root
  for (const part of parts) {
    if (!node || node.kind !== 'dir' || !node.children) return undefined
    node = node.children[part]
  }
  return node
}

export function listDir(root: FsNode, path: string, all = false): FsNode[] | undefined {
  const node = getNode(root, path)
  if (!node || node.kind !== 'dir' || !node.children) return undefined
  return Object.values(node.children)
    .filter((child) => all || !child.hidden)
    .sort((a, b) => {
      if (a.kind === 'dir' && b.kind !== 'dir') return -1
      if (a.kind !== 'dir' && b.kind === 'dir') return 1
      return a.name.localeCompare(b.name)
    })
}

export function formatListing(entries: FsNode[], long = false): string {
  if (entries.length === 0) return ''
  if (long) {
    return entries
      .map((entry) => {
        const mark = entry.kind === 'dir' ? 'd' : entry.kind === 'link' ? 'l' : '-'
        const label =
          entry.kind === 'dir'
            ? `${entry.name}/`
            : entry.kind === 'link'
              ? `${entry.name} -> ${entry.href}`
              : entry.name
        return `${mark}  ${label}`
      })
      .join('\n')
  }
  return entries
    .map((entry) => (entry.kind === 'dir' ? `${entry.name}/` : entry.name))
    .join('  ')
}
