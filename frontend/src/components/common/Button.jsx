import { Link } from 'react-router-dom'

export function Button({ children, variant = 'primary', className = '', to, ...props }) {
  const classes = `button button-${variant} ${className}`
  return to ? <Link to={to} className={classes} {...props}>{children}</Link> : <button className={classes} {...props}>{children}</button>
}
