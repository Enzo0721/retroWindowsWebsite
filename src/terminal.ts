import { Shell, type ShellAction } from './shell'

export function createTerminal(
  shell: Shell,
  handlers: {
    openUrl: (url: string) => void
    openWindow: (id: 'about' | 'projects') => void
    close: () => void
  },
): HTMLElement {
  const root = document.createElement('div')
  root.className = 'term'
  root.innerHTML = `
    <div class="term-log" role="log" aria-live="polite"></div>
    <div class="term-line">
      <label class="term-prompt" for="term-input"></label>
      <input id="term-input" class="term-input" type="text" autocomplete="off" spellcheck="false" aria-label="Command" />
    </div>
  `
  const log = root.querySelector<HTMLElement>('.term-log')!
  const prompt = root.querySelector<HTMLElement>('.term-prompt')!
  const input = root.querySelector<HTMLInputElement>('.term-input')!

  let histIndex = 0
  let draft = ''

  const banner = document.createElement('div')
  banner.className = 'term-banner'
  banner.textContent = 'KayaOS [Version 4.00.950]\n(C) Kaya. Type help.'
  log.append(banner)

  const renderPrompt = () => {
    prompt.textContent = `kaya:${shell.cwd}$`
  }
  renderPrompt()

  const scrollBottom = () => {
    log.scrollTop = log.scrollHeight
  }

  const print = (text: string, cls = '') => {
    if (!text) return
    const pre = document.createElement('pre')
    pre.className = `term-out ${cls}`.trim()
    pre.textContent = text
    log.append(pre)
  }

  const echoLine = (line: string) => {
    const row = document.createElement('div')
    row.className = 'term-echo'
    const p = document.createElement('span')
    p.className = 'term-prompt'
    p.textContent = `kaya:${shell.cwd}$`
    const cmd = document.createElement('span')
    cmd.textContent = ' ' + line
    row.append(p, cmd)
    log.append(row)
  }

  const apply = (actions: ShellAction[]) => {
    for (const action of actions) {
      switch (action.type) {
        case 'print':
          print(action.text)
          break
        case 'clear':
          log.replaceChildren()
          break
        case 'open-url':
          if (action.text) print(action.text)
          handlers.openUrl(action.url)
          break
        case 'open-window':
          if (action.text) print(action.text)
          handlers.openWindow(action.id)
          break
        case 'exit':
          handlers.close()
          break
      }
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const line = input.value
      echoLine(line)
      input.value = ''
      draft = ''
      apply(shell.exec(line))
      histIndex = shell.history.length
      renderPrompt()
      scrollBottom()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (shell.history.length === 0) return
      if (histIndex === shell.history.length) draft = input.value
      histIndex = Math.max(0, histIndex - 1)
      input.value = shell.history[histIndex] ?? ''
      input.setSelectionRange(input.value.length, input.value.length)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIndex >= shell.history.length) return
      histIndex += 1
      input.value = histIndex === shell.history.length ? draft : (shell.history[histIndex] ?? '')
      input.setSelectionRange(input.value.length, input.value.length)
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const result = shell.complete(input.value)
      if (result.listing) print(result.listing)
      input.value = result.value
      scrollBottom()
      return
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      log.replaceChildren()
      return
    }
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault()
      echoLine(input.value + '^C')
      input.value = ''
      draft = ''
      histIndex = shell.history.length
      scrollBottom()
    }
  })

  root.addEventListener('pointerdown', () => {
    input.focus({ preventScroll: true })
  })

  return root
}
