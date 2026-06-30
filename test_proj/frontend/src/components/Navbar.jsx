import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--navbar-h)',
      background: 'var(--navbar)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 100,
    }}>
      <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>📖</span>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '20px',
          fontWeight: 700,
          color: '#FAF6EE',
          letterSpacing: '0.3px',
        }}>
          Recipe Vault
        </span>
      </Link>

      <Link
        to="/add"
        style={{
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: '8px',
          padding: '8px 18px',
          fontWeight: 700,
          fontSize: '14px',
          display: 'inline-block',
        }}
      >
        + Add Recipe
      </Link>
    </nav>
  );
}
