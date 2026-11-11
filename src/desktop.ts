import { iconAbout, iconFolder, iconLab, iconTerminal, iconDoc } from './icons'
import type { Project } from './projects'
import { Shell } from './shell'
import { createTerminal } from './terminal'
import type { FsNode } from './vfs'
import { WindowManager } from './wm'

const GITHUB = 'https://github.com/Enzo0721'
const LINKEDIN = 'https://www.linkedin.com/in/kaya-ergin-8410011b5'
const EMAIL = 'kayajergin@gmail.com'
const LAB = 'https://lab.kayaergin.com'

export function mountDesktop(root: HTMLElement, projects: Project[], vfs: FsNode): void {
  root.innerHTML = `
    <div class="desk-icons" id="desk-icons"></div>
    <div class="desk-windows" id="desk-windows"></div>
    <div class="start-menu" id="start-menu" hidden>
      <div class="start-side"><span>KayaOS</span></div>
      <div class="start-items">
        <button type="button" data-open="projects">${iconFolder}<span>Projects</span></button>
        <button type="button" data-open="about">${iconAbout}<span>About</span></button>
        <button type="button" data-open="terminal">${iconTerminal}<span>Terminal</span></button>
        <a class="start-link" data-lab href="${LAB}" target="_blank" rel="noreferrer noopener">${iconLab}<span>Lab</span></a>
        <hr />
        <button type="button" data-shutdown>Shut Down...</button>
      </div>
    </div>
    <footer class="taskbar">
      <button type="button" class="start-btn" id="start-btn" aria-haspopup="true" aria-expanded="false" aria-controls="start-menu">
        <span class="start-logo" aria-hidden="true"></span>
        Start
      </button>
      <div class="task-list" id="task-list"></div>
      <time class="tray" id="clock" datetime=""></time>
    </footer>
    <div class="shutdown" id="shutdown" hidden>
      <p>It is now safe to turn off your computer.</p>
      <p class="shutdown-hint">Click to restart</p>
    </div>
  `

  const windowsHost = root.querySelector<HTMLElement>('#desk-windows')!
  const taskList = root.querySelector<HTMLElement>('#task-list')!
  const iconsHost = root.querySelector<HTMLElement>('#desk-icons')!
  const startMenu = root.querySelector<HTMLElement>('#start-menu')!
  const startBtn = root.querySelector<HTMLButtonElement>('#start-btn')!
  const shutdown = root.querySelector<HTMLElement>('#shutdown')!
  const clock = root.querySelector<HTMLTimeElement>('#clock')!

  const wm = new WindowManager(windowsHost, taskList)

  const aboutBody = document.createElement('div')
  aboutBody.className = 'about-body'
  aboutBody.innerHTML = `
    <div class="about-row">
      ${iconAbout}
      <p class="about-name">Kaya</p>
    </div>
    <p>Founding Engineer at VoltLayer. Previously at Toozy.</p>
    <ul class="contact">
      <li><a href="${GITHUB}" target="_blank" rel="noreferrer noopener">GitHub</a></li>
      <li><a href="${LINKEDIN}" target="_blank" rel="noreferrer noopener">LinkedIn</a></li>
      <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
    </ul>
    <div class="dlg-actions">
      <button type="button" class="os-btn" data-close-about>Close</button>
    </div>
  `
  aboutBody.querySelector('[data-close-about]')?.addEventListener('click', () => wm.close('about'))

  const projectsBody = document.createElement('div')
  projectsBody.className = 'projects-body sunken'
  if (projects.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'empty'
    empty.textContent = 'No projects yet. Add a markdown file to content/projects/.'
    projectsBody.append(empty)
  } else {
    for (const project of projects) {
      projectsBody.append(projectRow(project))
    }
  }

  const shell = new Shell(vfs, projects)
  const termBody = createTerminal(shell, {
    openUrl: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    openWindow: (id) => wm.open(id),
    close: () => wm.close('terminal'),
  })

  wm.register({
    id: 'about',
    title: 'About',
    x: 110,
    y: 70,
    w: 400,
    h: 236,
    body: aboutBody,
    icon: iconAbout,
  })
  wm.register({
    id: 'projects',
    title: 'Projects',
    x: 200,
    y: 48,
    w: 480,
    h: 340,
    body: projectsBody,
    icon: iconFolder,
  })
  wm.register({
    id: 'terminal',
    title: 'Terminal',
    x: 150,
    y: 88,
    w: 560,
    h: 330,
    body: termBody,
    icon: iconTerminal,
  })

  const icons: {
    id: string
    label: string
    icon: string
    action?: () => void
    href?: string
  }[] = [
    { id: 'projects', label: 'Projects', icon: iconFolder, action: () => wm.open('projects') },
    { id: 'about', label: 'About', icon: iconAbout, action: () => wm.open('about') },
    { id: 'terminal', label: 'Terminal', icon: iconTerminal, action: () => wm.open('terminal') },
    { id: 'lab', label: 'Lab', icon: iconLab, href: LAB },
  ]

  icons.forEach((item, i) => {
    const el = item.href
      ? Object.assign(document.createElement('a'), {
          href: item.href,
          target: '_blank',
          rel: 'noreferrer noopener',
        })
      : Object.assign(document.createElement('button'), { type: 'button' })
    el.className = 'desk-icon'
    el.style.top = `${16 + i * 84}px`
    el.style.left = '16px'
    el.innerHTML = `${item.icon}<span class="desk-label">${item.label}</span>`
    el.addEventListener('click', () => {
      closeStart()
      item.action?.()
    })
    iconsHost.append(el)
  })

  const toggleStart = () => {
    const open = startMenu.hasAttribute('hidden')
    startMenu.hidden = !open
    startBtn.setAttribute('aria-expanded', String(open))
    startBtn.classList.toggle('pressed', open)
  }
  const closeStart = () => {
    startMenu.hidden = true
    startBtn.setAttribute('aria-expanded', 'false')
    startBtn.classList.remove('pressed')
  }

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleStart()
  })
  startMenu.addEventListener('click', (e) => e.stopPropagation())
  root.addEventListener('click', () => closeStart())
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeStart()
      shutdown.hidden = true
    }
  })

  startMenu.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.open as 'about' | 'projects' | 'terminal'
      closeStart()
      wm.open(id)
    })
  })
  startMenu.querySelector('[data-lab]')?.addEventListener('click', () => closeStart())
  startMenu.querySelector('[data-shutdown]')?.addEventListener('click', () => {
    closeStart()
    shutdown.hidden = false
    shutdown.focus()
  })
  shutdown.addEventListener('click', () => {
    shutdown.hidden = true
  })
  shutdown.tabIndex = -1

  const tick = () => {
    const now = new Date()
    clock.dateTime = now.toISOString()
    clock.textContent = now.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  tick()
  window.setInterval(tick, 30_000)
}

function projectRow(project: Project): HTMLElement {
  const row = document.createElement('article')
  row.className = 'project-row'
  const media = project.image
    ? `<img src="${escapeAttr(project.image)}" alt="" width="40" height="40" />`
    : iconDoc
  const links: string[] = []
  if (project.github) {
    links.push(
      `<a href="${escapeAttr(project.github)}" target="_blank" rel="noreferrer noopener">GitHub</a>`,
    )
  }
  if (project.url) {
    links.push(
      `<a href="${escapeAttr(project.url)}" target="_blank" rel="noreferrer noopener">Site</a>`,
    )
  }
  row.innerHTML = `
    <div class="project-icon">${media}</div>
    <div class="project-meta">
      <h2>${escapeHtml(project.title)}</h2>
      <p>${escapeHtml(project.description)}</p>
      <p class="project-links">${links.join(' · ')}</p>
    </div>
  `
  return row
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
