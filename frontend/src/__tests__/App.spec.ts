import { describe, it, expect } from 'vitest'

import { render, screen } from '@testing-library/vue'
import App from '../App.vue'

describe('App', () => {
  it('mounts renders properly', () => {
    render(App)
    expect(screen.getByRole('heading', { name: 'You did it!' })).toBeTruthy()
  })
})
