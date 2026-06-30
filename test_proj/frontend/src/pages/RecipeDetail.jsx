import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getRecipe, deleteRecipe } from '../api/api';

const CARD_COLORS = [
  '#E8D5C4', '#C4D8CC', '#D4C8E8',
  '#C8D8E8', '#E8D8C8', '#C8E8D4',
];

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setLoading(true);
    getRecipe(id)
      .then(({ data }) => setData(data))
      .catch(() => setError('Recipe not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (location.state?.saved) {
      setToast('Recipe saved successfully!');
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteRecipe(id);
      navigate('/home', { state: { deleted: true } });
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 32px' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--text)', marginBottom: '12px' }}>Recipe not found</p>
        <button onClick={() => navigate('/home')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '15px', fontWeight: 700 }}>Back to Home</button>
      </div>
    );
  }

  const { emoji, recipe, ingredients, equipments } = data;
  const headerColor = CARD_COLORS[data.id % CARD_COLORS.length];
  const steps = recipe.instructions.split(/\n+/).filter(Boolean);

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', animation: 'fadeUp 0.4s ease' }}>
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

      <div style={{
        background: headerColor,
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        position: 'relative',
      }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>{emoji}</div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(24px, 4vw, 40px)',
          fontWeight: 700,
          color: 'var(--text)',
          textAlign: 'center',
          marginBottom: '16px',
          maxWidth: '700px',
        }}>
          {recipe.title}
        </h1>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {recipe.durationInMinutes && (
            <span style={{ background: 'rgba(44,26,14,0.1)', color: 'var(--text)', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              ⏱ {recipe.durationInMinutes} min
            </span>
          )}
          {recipe.serving && (
            <span style={{ background: 'rgba(44,26,14,0.1)', color: 'var(--text)', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              👥 {recipe.serving} serving{recipe.serving !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div style={{ position: 'absolute', top: '16px', right: '24px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/review', { state: { existing: data } })}
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(44,26,14,0.15)',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(196,98,45,0.3)',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--accent)',
            }}
          >
            🗑 Delete
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: 'clamp(200px, 28%, 280px) 1fr', gap: '48px' }}>
        <aside>
          {ingredients.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                Ingredients
              </h2>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ingredients.map((ing) => (
                  <li key={ing.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    {ing.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {equipments.length > 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                Equipment
              </h2>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {equipments.map((eq) => (
                  <li key={eq.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C9A82', flexShrink: 0 }} />
                    {eq.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <main>
          <p style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '32px' }}>
            {recipe.description}
          </p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
            Instructions
          </h2>
          <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {steps.map((step, i) => (
              <li key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '1px',
                }}>
                  {i + 1}
                </span>
                <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'var(--text)' }}>{step}</p>
              </li>
            ))}
          </ol>

          {recipe.notes && (
            <div style={{ marginTop: '40px', background: '#FFF8F0', border: '1px solid #F0D8C0', borderRadius: '12px', padding: '20px 24px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Notes</h3>
              <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7 }}>{recipe.notes}</p>
            </div>
          )}
        </main>
      </div>

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(44,26,14,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, animation: 'fadeUp 0.2s ease',
        }} onClick={() => setConfirmDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '16px',
            padding: '32px', maxWidth: '400px', width: '90%',
            boxShadow: '0 20px 60px rgba(44,26,14,0.25)',
            animation: 'popIn 0.2s ease',
          }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--text)', marginBottom: '12px' }}>Delete recipe?</h3>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>
              This will permanently delete "{recipe.title}". This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: '10px', padding: '10px 24px', fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: 'transparent', color: 'var(--muted)',
                  border: '1.5px solid var(--border)', borderRadius: '10px',
                  padding: '10px 24px', fontSize: '15px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
