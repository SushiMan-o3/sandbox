import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { recipeToDB, updateRecipe } from '../api/api';

const inputStyle = {
  width: '100%',
  padding: '11px 16px',
  border: '1.5px solid var(--border)',
  borderRadius: '10px',
  background: 'var(--input-bg)',
  color: 'var(--text)',
  fontSize: '15px',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--muted)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

function ChipInput({ items, onChange, placeholder }) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (v && !items.find((i) => i.name === v)) {
      onChange([...items, { name: v }]);
    }
    setInput('');
  }

  function remove(name) {
    onChange(items.filter((i) => i.name !== name));
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        {items.map((item) => (
          <span
            key={item.name}
            style={{
              background: '#F5EDE4',
              border: '1px solid #EDD8C8',
              borderRadius: '20px',
              padding: '4px 10px 4px 12px',
              fontSize: '13px',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {item.name}
            <button
              type="button"
              onClick={() => remove(item.name)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 0, fontSize: '14px', lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ ...inputStyle, flex: 1 }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
        />
        <button
          type="button"
          onClick={add}
          style={{
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: '10px',
            padding: '0 18px', fontSize: '14px',
            fontWeight: 700,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function ReviewRecipe() {
  const location = useLocation();
  const navigate = useNavigate();
  const { parsed, existing } = location.state || {};
  const init = parsed || existing;

  const [recipe, setRecipe] = useState({
    title: init?.recipe?.title || '',
    description: init?.recipe?.description || '',
    instructions: init?.recipe?.instructions || '',
    durationInMinutes: init?.recipe?.durationInMinutes || '',
    serving: init?.recipe?.serving || '',
    notes: init?.recipe?.notes || '',
  });
  const [ingredients, setIngredients] = useState(init?.ingredients || []);
  const [equipments, setEquipments] = useState(init?.equipments || []);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  if (!init) {
    navigate('/add');
    return null;
  }

  async function handleSave(e) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const payload = {
        recipe: {
          ...recipe,
          durationInMinutes: parseInt(recipe.durationInMinutes, 10) || 0,
          serving: parseInt(recipe.serving, 10) || 0,
          notes: recipe.notes || null,
        },
        ingredients,
        equipments,
      };

      let data;
      if (existing?.id) {
        ({ data } = await updateRecipe(existing.id, payload));
      } else {
        ({ data } = await recipeToDB(payload));
      }
      navigate(`/recipe/${data.id}`, { state: { saved: true } });
    } catch (e) {
      setStatus('error');
      setError(e.response?.data?.detail || 'Failed to save recipe.');
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 32px', maxWidth: '760px', margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '32px',
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: '8px',
      }}>
        {existing?.id ? 'Edit Recipe' : 'Review Recipe'}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '32px' }}>
        {existing?.id ? 'Make changes and save.' : 'Review the imported details and make any edits before saving.'}
      </p>

      {parsed?.unmapped_text?.length > 0 && (
        <div style={{
          background: '#FFF8F0',
          border: '1px solid #F0D8C0',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}>
          <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Unmatched text from import
          </p>
          {parsed.unmapped_text.map((t, i) => (
            <p key={i} style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>{t}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <input required value={recipe.title} onChange={(e) => setRecipe({ ...recipe, title: e.target.value })} placeholder="Recipe title" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
        </div>
        <div>
          <label style={labelStyle}>Description *</label>
          <textarea required value={recipe.description} onChange={(e) => setRecipe({ ...recipe, description: e.target.value })} placeholder="Brief description" rows={3} style={{ ...inputStyle, resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
        </div>
        <div>
          <label style={labelStyle}>Instructions *</label>
          <textarea required value={recipe.instructions} onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })} placeholder="Step by step instructions..." rows={8} style={{ ...inputStyle, resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Duration (mins) *</label>
            <input required type="number" min="1" value={recipe.durationInMinutes} onChange={(e) => setRecipe({ ...recipe, durationInMinutes: e.target.value })} placeholder="30" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Servings *</label>
            <input required type="number" min="1" value={recipe.serving} onChange={(e) => setRecipe({ ...recipe, serving: e.target.value })} placeholder="4" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Ingredients</label>
          <ChipInput items={ingredients} onChange={setIngredients} placeholder="Add ingredient..." />
        </div>
        <div>
          <label style={labelStyle}>Equipment</label>
          <ChipInput items={equipments} onChange={setEquipments} placeholder="Add equipment..." />
        </div>
        <div>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea value={recipe.notes || ''} onChange={(e) => setRecipe({ ...recipe, notes: e.target.value })} placeholder="Tips, substitutions, notes..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
        </div>

        {error && (
          <div style={{ background: '#FEF0ED', border: '1px solid #F5C6B8', color: 'var(--accent)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              background: status === 'loading' ? '#C4A898' : 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '13px 32px', fontSize: '15px', fontWeight: 700,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {status === 'loading' ? (
              <>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Saving...
              </>
            ) : existing?.id ? 'Save Changes' : 'Save Recipe'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent', color: 'var(--muted)',
              border: '1.5px solid var(--border)', borderRadius: '10px',
              padding: '13px 24px', fontSize: '15px',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
