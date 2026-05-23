function GlassCard({ className = '', children }) {
  return <div className={`glass-panel rounded-3xl ${className}`}>{children}</div>;
}

export default GlassCard;
