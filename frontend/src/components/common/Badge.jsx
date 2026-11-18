export function Badge({ children, tone = 'sage', className = '' }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>
}
