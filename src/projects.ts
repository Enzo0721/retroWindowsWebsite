export type Project = {
  slug: string
  title: string
  description: string
  github?: string
  url?: string
  image?: string
  body: string
  raw: string
}

const files = import.meta.glob('../content/projects/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw.trim() }
  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    meta[key] = value
  }
  return { meta, body: match[2].trim() }
}

function slugFromPath(path: string): string {
  const file = path.split('/').pop() ?? path
  return file.replace(/\.md$/i, '')
}

export function loadProjects(): Project[] {
  const projects: Project[] = []
  for (const [path, raw] of Object.entries(files)) {
    const slug = slugFromPath(path)
    if (slug.startsWith('_')) continue
    const { meta, body } = parseFrontmatter(raw)
    const title = meta.title?.trim() || slug
    const description = meta.description?.trim() || ''
    const project: Project = {
      slug,
      title,
      description,
      body,
      raw: raw.trim(),
    }
    if (meta.github) project.github = meta.github
    if (meta.url) project.url = meta.url
    if (meta.image) project.image = meta.image
    projects.push(project)
  }
  projects.sort((a, b) => a.title.localeCompare(b.title))
  return projects
}
