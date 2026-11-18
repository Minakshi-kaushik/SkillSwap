import { forwardRef } from 'react'

export const Input = forwardRef(function Input({ label, id, hint, error, className = '', ...props }, ref) {
  const inputId = id || props.name
  return <div className={`field ${className}`}>
    {label && <label htmlFor={inputId}>{label}</label>}
    <input ref={ref} id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} {...props} />
    {error && <small className="field-error" id={`${inputId}-error`}>{error}</small>}
    {!error && hint && <small className="field-hint" id={`${inputId}-hint`}>{hint}</small>}
  </div>
})
