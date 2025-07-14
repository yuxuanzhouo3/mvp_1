import React from 'react'
import { render, screen } from '@testing-library/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(<Card>Card content</Card>)
      const card = screen.getByText('Card content')
      expect(card).toBeInTheDocument()
      expect(card.parentElement).toHaveClass('rounded-lg border bg-card')
    })

    it('renders with custom className', () => {
      render(<Card className="custom-card">Custom card</Card>)
      expect(screen.getByText('Custom card').parentElement).toHaveClass('custom-card')
    })
  })

  describe('CardHeader', () => {
    it('renders with default props', () => {
      render(<CardHeader>Header content</CardHeader>)
      const header = screen.getByText('Header content')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex flex-col space-y-1.5 p-6')
    })

    it('renders with custom className', () => {
      render(<CardHeader className="custom-header">Custom header</CardHeader>)
      expect(screen.getByText('Custom header')).toHaveClass('custom-header')
    })
  })

  describe('CardTitle', () => {
    it('renders with default props', () => {
      render(<CardTitle>Card Title</CardTitle>)
      const title = screen.getByText('Card Title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass('text-2xl font-semibold leading-none tracking-tight')
    })

    it('renders with custom className', () => {
      render(<CardTitle className="custom-title">Custom title</CardTitle>)
      expect(screen.getByText('Custom title')).toHaveClass('custom-title')
    })
  })

  describe('CardDescription', () => {
    it('renders with default props', () => {
      render(<CardDescription>Card description</CardDescription>)
      const description = screen.getByText('Card description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-sm text-muted-foreground')
    })

    it('renders with custom className', () => {
      render(<CardDescription className="custom-desc">Custom description</CardDescription>)
      expect(screen.getByText('Custom description')).toHaveClass('custom-desc')
    })
  })

  describe('CardContent', () => {
    it('renders with default props', () => {
      render(<CardContent>Content here</CardContent>)
      const content = screen.getByText('Content here')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('p-6 pt-0')
    })

    it('renders with custom className', () => {
      render(<CardContent className="custom-content">Custom content</CardContent>)
      expect(screen.getByText('Custom content')).toHaveClass('custom-content')
    })
  })

  describe('CardFooter', () => {
    it('renders with default props', () => {
      render(<CardFooter>Footer content</CardFooter>)
      const footer = screen.getByText('Footer content')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('flex items-center p-6 pt-0')
    })

    it('renders with custom className', () => {
      render(<CardFooter className="custom-footer">Custom footer</CardFooter>)
      expect(screen.getByText('Custom footer')).toHaveClass('custom-footer')
    })
  })

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Test content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByText('Test content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('renders multiple cards correctly', () => {
      render(
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Card 1</CardTitle>
            </CardHeader>
            <CardContent>Content 1</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Card 2</CardTitle>
            </CardHeader>
            <CardContent>Content 2</CardContent>
          </Card>
        </div>
      )

      expect(screen.getByText('Card 1')).toBeInTheDocument()
      expect(screen.getByText('Card 2')).toBeInTheDocument()
      expect(screen.getByText('Content 1')).toBeInTheDocument()
      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })
  })
}) 