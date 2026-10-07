import { describe, it, expect, beforeEach } from 'vitest'
import {
  focusableIn,
  trapTab,
  initialFocusTarget,
} from '~/lat/composables/latDialogKeys'

function dialog(html) {
  document.body.innerHTML = `<button id="outside">outside</button><div id="dlg">${html}</div>`
  return document.getElementById('dlg')
}

function tab(shift = false) {
  let prevented = false
  return {
    key: 'Tab',
    shiftKey: shift,
    preventDefault: () => {
      prevented = true
    },
    get prevented() {
      return prevented
    },
  }
}

describe('focusableIn', () => {
  beforeEach(() => (document.body.innerHTML = ''))

  it('lists controls in order and skips disabled, hidden-input and aria-hidden ones', () => {
    const d = dialog(`
      <input id="a" type="hidden"><input id="b"><button id="c" disabled>x</button>
      <select id="d"></select><a id="e" href="#">l</a><span id="f" tabindex="0">t</span>
      <button id="g" aria-hidden="true">h</button><span tabindex="-1">no</span>`)
    expect(focusableIn(d).map((el) => el.id)).toEqual(['b', 'd', 'e', 'f'])
  })

  it('is empty for nothing', () => {
    expect(focusableIn(null)).toEqual([])
  })
})

describe('trapTab', () => {
  beforeEach(() => (document.body.innerHTML = ''))

  it('wraps forward from the last control to the first', () => {
    const d = dialog('<input id="first"><button id="last">ok</button>')
    document.getElementById('last').focus()
    const ev = tab()
    expect(trapTab(ev, d)).toBe(true)
    expect(ev.prevented).toBe(true)
    expect(document.activeElement.id).toBe('first')
  })

  it('wraps backwards from the first control to the last', () => {
    const d = dialog('<input id="first"><button id="last">ok</button>')
    document.getElementById('first').focus()
    const ev = tab(true)
    expect(trapTab(ev, d)).toBe(true)
    expect(document.activeElement.id).toBe('last')
  })

  it('leaves ordinary tabbing in the middle alone', () => {
    const d = dialog(
      '<input id="first"><input id="mid"><button id="last">ok</button>'
    )
    document.getElementById('mid').focus()
    const ev = tab()
    expect(trapTab(ev, d)).toBe(false)
    expect(ev.prevented).toBe(false)
  })

  it('pulls focus back in when it has escaped the dialog', () => {
    const d = dialog('<input id="first"><button id="last">ok</button>')
    document.getElementById('outside').focus()
    expect(trapTab(tab(), d)).toBe(true)
    expect(document.activeElement.id).toBe('first')
  })

  it('ignores other keys', () => {
    const d = dialog('<input id="first">')
    expect(trapTab({ key: 'Enter', preventDefault() {} }, d)).toBe(false)
  })
})

describe('initialFocusTarget', () => {
  beforeEach(() => (document.body.innerHTML = ''))

  it('prefers the first field over an earlier close button', () => {
    const d = dialog(
      '<button id="close">x</button><input id="name"><input id="email">'
    )
    expect(initialFocusTarget(d).id).toBe('name')
  })

  it('falls back to the first control, then null', () => {
    expect(initialFocusTarget(dialog('<button id="only">x</button>')).id).toBe(
      'only'
    )
    expect(initialFocusTarget(dialog('<p>text</p>'))).toBe(null)
    expect(initialFocusTarget(null)).toBe(null)
  })
})
