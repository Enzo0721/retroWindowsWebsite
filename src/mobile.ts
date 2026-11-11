import type { Project } from './projects'

const GITHUB = 'https://github.com/Enzo0721'
const LINKEDIN = 'https://www.linkedin.com/in/kaya-ergin-8410011b5'
const EMAIL = 'kayajergin@gmail.com'
const LAB = 'https://lab.kayaergin.com'

export function mountMobile(root: HTMLElement, projects: Project[]): void {
  const items = projects
    .map((project) => {
      const links: string[] = []
      if (project.github) {
        links.push(
          `<a href="${esc(project.github)}" target="_blank" rel="noreferrer noopener">GitHub</a>`,
        )
      }
      if (project.url) {
        links.push(
          `<a href="${esc(project.url)}" target="_blank" rel="noreferrer noopener">Site</a>`,
        )
      }
      const img = project.image
        ? `<img src="${esc(project.image)}" alt="" width="48" height="48" />`
        : ''
      return `<article class="m-project">
        ${img}
        <div>
          <h2>${esc(project.title)}</h2>
          <p>${esc(project.description)}</p>
          <p class="m-links">${links.join(' · ')}</p>
        </div>
      </article>`
    })
    .join('')

  root.innerHTML = `
    <header class="m-top">
      <h1>Kaya</h1>
      <p>Founding Engineer at VoltLayer. Previously at Toozy.</p>
      <nav class="m-contact" aria-label="Contact">
        <a href="${GITHUB}" target="_blank" rel="noreferrer noopener">GitHub</a>
        <a href="${LINKEDIN}" target="_blank" rel="noreferrer noopener">LinkedIn</a>
        <a href="mailto:${EMAIL}">Email</a>
      </nav>
    </header>
    <section aria-labelledby="m-projects">
      <h2 id="m-projects">Projects</h2>
      ${items || '<p>No projects yet.</p>'}
    </section>
    <p class="m-lab"><a href="${LAB}" rel="noreferrer noopener">Lab</a></p>
  `
}

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
