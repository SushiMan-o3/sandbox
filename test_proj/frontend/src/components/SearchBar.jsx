export default function SearchBar({ value, onChange, placeholder = 'Search recipes...' }) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
      <svg
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '18px',
          height: '18px',
          pointerEvents: 'none',
          color: 'var(--muted)',
        }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '11px 16px 11px 42px',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          background: 'var(--input-bg)',
          color: 'var(--text)',
          fontSize: '15px',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
      />
    </div>
  );
}
