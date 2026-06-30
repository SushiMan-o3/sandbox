import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import SearchBar from '../components/SearchBar';
import { getRecipes } from '../api/api';

export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (location.state?.saved) {
      setToast('Recipe saved successfully!');
    } else if (location.state?.deleted) {
      setToast('Recipe deleted.');
    }
    if (location.state?.saved || location.state?.deleted) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  const fetchRecipes = useCallback(async (q, p, reset) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getRecipes(q, p, 6);
      setRecipes((prev) => (reset ? data : [...prev, ...data]));
      setHasMore(data.length === 6);
    } catch {
      setError('Failed to load recipes. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchRecipes(query, 0, true);
  }, [query, fetchRecipes]);

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchRecipes(query, nextPage, false);
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 32px', maxWidth: '1100px', margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--green)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 700,
          zIndex: 200,
          animation: 'slideDown 0.3s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          ✓ {toast}
        </div>
      )}

      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '4px',
          }}>
            Your Recipes
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            {recipes.length > 0 ? `${recipes.length} recipes saved` : 'No recipes yet — add your first one!'}
          </p>
        </div>
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {error && (
        <div style={{
          background: '#FEF0ED',
          border: '1px solid #F5C6B8',
          color: 'var(--accent)',
          padding: '14px 20px',
          borderRadius: '10px',
          marginBottom: '24px',
          fontSize: '15px',
        }}>
          {error}
        </div>
      )}

      {recipes.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '40px',
          animation: 'fadeUp 0.4s ease',
        }}>
          {recipes.map((r, i) => (
            <RecipeCard key={r.id} recipe={r} index={i} />
          ))}
        </div>
      ) : !loading ? (
        <div style={{ textAlign: 'center', padding: '80px 32px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🍽️</div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>
            {query ? 'No recipes match your search' : 'No recipes yet'}
          </p>
          <p style={{ fontSize: '15px' }}>
            {query ? 'Try different keywords' : 'Add your first recipe to get started'}
          </p>
        </div>
      ) : null}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '36px', height: '36px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto',
          }} />
        </div>
      )}

      {hasMore && !loading && recipes.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button
            onClick={loadMore}
            style={{
              background: 'transparent',
              border: '1.5px solid var(--border)',
              color: 'var(--text)',
              borderRadius: '10px',
              padding: '11px 32px',
              fontSize: '15px',
              fontWeight: 700,
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.color = 'var(--text)';
            }}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
