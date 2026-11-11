import './style.css'
import { mountDesktop } from './desktop'
import { mountMobile } from './mobile'
import { loadProjects } from './projects'
import { createVfs } from './vfs'

const projects = loadProjects()
const vfs = createVfs(projects)

const desktop = document.querySelector<HTMLElement>('#desktop')
const mobile = document.querySelector<HTMLElement>('#mobile')

if (!desktop || !mobile) {
  throw new Error('Missing app roots')
}

mountDesktop(desktop, projects, vfs)
mountMobile(mobile, projects)
