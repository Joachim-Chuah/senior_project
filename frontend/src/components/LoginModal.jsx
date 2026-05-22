import React, { useState, useEffect } from 'react'
import { BarChart2, Lock, Eye, EyeOff, ArrowRight, X } from 'lucide-react'

const DEMO_USER = 'demo'
const DEMO_PASS = 'rylo123'

export default function LoginModal({ onSuccess, onClose }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    if (username === DEMO_USER && password === DEMO_PASS) {
      onSuccess()
    } else {
      setError('Invalid username or password.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-xl border p-8 shadow-xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <BarChart2 size={15} style={{ color: 'var(--accent-text)' }} />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text)' }}>Rylo</span>
        </div>

        <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Sign in</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Access requires an account.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => { setUsername(e.target.value); setError('') }}
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            autoComplete="username"
            autoFocus
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)', opacity: 0.6 }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && <p className="text-xs text-center" style={{ color: '#dc2626' }}>{error}</p>}

          <button
            type="submit"
            className="group btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-sm rounded-xl mt-1"
          >
            <Lock size={13} />
            Sign in
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>

          <p className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            Use <span className="font-mono">demo</span> / <span className="font-mono">rylo123</span>
          </p>
        </form>
      </div>
    </div>
  )
}
