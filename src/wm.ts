export type WindowId = 'about' | 'projects' | 'terminal'

export type WindowSpec = {
  id: WindowId
  title: string
  x: number
  y: number
  w: number
  h: number
  body: HTMLElement
  icon?: string
}

type WindowRecord = {
  spec: WindowSpec
  el: HTMLElement
  task: HTMLButtonElement
  x: number
  y: number
  open: boolean
  minimized: boolean
}

export class WindowManager {
  private host: HTMLElement
  private tasks: HTMLElement
  private windows = new Map<WindowId, WindowRecord>()
  private z = 20
  private focused: WindowId | null = null
  private onChange: () => void

  constructor(host: HTMLElement, tasks: HTMLElement, onChange: () => void = () => {}) {
    this.host = host
    this.tasks = tasks
    this.onChange = onChange
  }

  register(spec: WindowSpec): void {
    const el = document.createElement('div')
    el.className = 'os-window'
    el.id = `win-${spec.id}`
    el.tabIndex = -1
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-labelledby', `title-${spec.id}`)
    el.hidden = true
    el.style.left = `${spec.x}px`
    el.style.top = `${spec.y}px`
    el.style.width = `${spec.w}px`
    el.style.height = `${spec.h}px`
    el.innerHTML = `
      <div class="titlebar" data-drag>
        <span class="titlebar-icon">${spec.icon ?? ''}</span>
        <span class="titlebar-label" id="title-${spec.id}">${escapeHtml(spec.title)}</span>
        <div class="titlebar-btns">
          <button type="button" class="wbtn" data-min aria-label="Minimize">
            <svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true"><path d="M1 6.5 H7" stroke="#000" stroke-width="1.5"/></svg>
          </button>
          <button type="button" class="wbtn" data-close aria-label="Close">
            <svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true"><path d="M1.5 1.5 L6.5 6.5 M6.5 1.5 L1.5 6.5" stroke="#000" stroke-width="1.5"/></svg>
          </button>
        </div>
      </div>
    `
    spec.body.classList.add('win-body')
    el.append(spec.body)

    const task = document.createElement('button')
    task.type = 'button'
    task.className = 'task-btn'
    task.hidden = true
    task.innerHTML = `${spec.icon ?? ''}<span>${escapeHtml(spec.title)}</span>`

    const rec: WindowRecord = {
      spec,
      el,
      task,
      x: spec.x,
      y: spec.y,
      open: false,
      minimized: false,
    }
    this.windows.set(spec.id, rec)
    this.host.append(el)
    this.tasks.append(task)

    el.addEventListener('pointerdown', () => this.focus(spec.id))
    task.addEventListener('click', () => {
      if (rec.open && !rec.minimized && this.focused === spec.id) this.minimize(spec.id)
      else this.open(spec.id)
    })
    el.querySelector('[data-close]')?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.close(spec.id)
    })
    el.querySelector('[data-min]')?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.minimize(spec.id)
    })
    this.enableDrag(rec)

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        this.close(spec.id)
      }
    })
  }

  open(id: WindowId): void {
    const rec = this.windows.get(id)
    if (!rec) return
    rec.open = true
    rec.minimized = false
    rec.el.hidden = false
    rec.task.hidden = false
    this.focus(id)
    this.onChange()
  }

  close(id: WindowId): void {
    const rec = this.windows.get(id)
    if (!rec) return
    rec.open = false
    rec.minimized = false
    rec.el.hidden = true
    rec.task.hidden = true
    rec.el.classList.remove('focused')
    rec.task.classList.remove('active')
    if (this.focused === id) this.focused = null
    this.onChange()
  }

  minimize(id: WindowId): void {
    const rec = this.windows.get(id)
    if (!rec || !rec.open) return
    rec.minimized = true
    rec.el.hidden = true
    rec.el.classList.remove('focused')
    rec.task.classList.remove('active')
    if (this.focused === id) this.focused = null
    this.onChange()
  }

  focus(id: WindowId): void {
    const rec = this.windows.get(id)
    if (!rec || !rec.open || rec.minimized) return
    this.z += 1
    rec.el.style.zIndex = String(this.z)
    rec.el.hidden = false
    rec.minimized = false
    for (const other of this.windows.values()) {
      other.el.classList.toggle('focused', other === rec)
      other.task.classList.toggle('active', other === rec)
    }
    this.focused = id
    const input = rec.spec.body.querySelector<HTMLInputElement>('input')
    if (input) input.focus({ preventScroll: true })
    else rec.el.focus({ preventScroll: true })
    this.onChange()
  }

  isOpen(id: WindowId): boolean {
    return this.windows.get(id)?.open ?? false
  }

  private enableDrag(rec: WindowRecord): void {
    const bar = rec.el.querySelector<HTMLElement>('[data-drag]')
    if (!bar) return
    let startX = 0
    let startY = 0
    let origX = 0
    let origY = 0
    let dragging = false

    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const maxX = Math.max(0, window.innerWidth - 80)
      const maxY = Math.max(0, window.innerHeight - 72)
      rec.x = clamp(origX + dx, -rec.el.offsetWidth + 80, maxX)
      rec.y = clamp(origY + dy, 0, maxY)
      rec.el.style.left = `${rec.x}px`
      rec.el.style.top = `${rec.y}px`
    }
    const onUp = (e: PointerEvent) => {
      dragging = false
      bar.releasePointerCapture(e.pointerId)
      document.removeEventListener('pointermove', onMove)
    }
    bar.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return
      dragging = true
      startX = e.clientX
      startY = e.clientY
      origX = rec.x
      origY = rec.y
      bar.setPointerCapture(e.pointerId)
      document.addEventListener('pointermove', onMove)
      bar.addEventListener('pointerup', onUp, { once: true })
    })
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
