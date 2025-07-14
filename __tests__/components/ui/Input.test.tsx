import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/input'
import { Mail } from 'lucide-react'

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('flex h-10 w-full')
  })

  it('renders with different types', () => {
    const { rerender } = render(<Input type="text" placeholder="Text" />)
    expect(screen.getByPlaceholderText('Text')).toHaveAttribute('type', 'text')

    rerender(<Input type="email" placeholder="Email" />)
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" placeholder="Password" />)
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')

    rerender(<Input type="number" placeholder="Number" />)
    expect(screen.getByPlaceholderText('Number')).toHaveAttribute('type', 'number')
  })

  it('renders with icon', () => {
    render(<Input icon={<Mail data-testid="mail-icon" />} placeholder="With icon" />)
    expect(screen.getByTestId('mail-icon')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('With icon')).toHaveClass('pl-10')
  })

  it('handles value changes', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} placeholder="Type here" />)
    
    const input = screen.getByPlaceholderText('Type here')
    fireEvent.change(input, { target: { value: 'test value' } })
    
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('test value')
  })

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled" />)
    const input = screen.getByPlaceholderText('Disabled')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed')
  })

  it('can be read-only', () => {
    render(<Input readOnly placeholder="Read only" />)
    const input = screen.getByPlaceholderText('Read only')
    expect(input).toHaveAttribute('readonly')
  })

  it('renders with custom className', () => {
    render(<Input className="custom-input" placeholder="Custom" />)
    expect(screen.getByPlaceholderText('Custom')).toHaveClass('custom-input')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} placeholder="Ref test" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('handles focus and blur events', () => {
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()
    
    render(
      <Input 
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Focus test"
      />
    )
    
    const input = screen.getByPlaceholderText('Focus test')
    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalled()
    
    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalled()
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Input size="default" placeholder="Default" />)
    expect(screen.getByPlaceholderText('Default')).toHaveClass('h-10')

    rerender(<Input size="sm" placeholder="Small" />)
    expect(screen.getByPlaceholderText('Small')).toHaveClass('h-9')

    rerender(<Input size="lg" placeholder="Large" />)
    expect(screen.getByPlaceholderText('Large')).toHaveClass('h-11')
  })

  it('handles controlled input', () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('')
      return (
        <Input 
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Controlled"
        />
      )
    }
    
    render(<TestComponent />)
    const input = screen.getByPlaceholderText('Controlled')
    
    fireEvent.change(input, { target: { value: 'new value' } })
    expect(input).toHaveValue('new value')
  })
}) 