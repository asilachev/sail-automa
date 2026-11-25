import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App.tsx'

describe('the app shell', () => {
  it('shows the BOSUN wordmark in every language', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'BOSUN' })).toBeInTheDocument()
  })
})
