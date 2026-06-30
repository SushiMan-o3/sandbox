import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { urlToJson, uploadFileToJson, recipeToDB } from '../api/api';

const TABS = ['Import URL', 'Upload File', 'Manual Entry'];

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

function Spinner() {
  return (
    <span style={{
      width: '16px', height: '16px',
      border: '2px solid rgba(255,255,255,0.4)',
      borderTop: '2px solid #fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }} />
  );
}

export default function AddRecipe() {
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();

  const [urlVal, setUrlVal] = useState('');
  const [urlStatus, setUrlStatus] = useState('idle');
  const [urlError, setUrlError] = useState('');

  const [file, setFile] = useState(null);
  const [fileStatus, setFileStatus] = useState('idle');
  const [fileError, setFileError] = useState('');
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const [manual, setManual] = useState({
    title: '', description: '', instructions: '',
    durationInMinutes: '', serving: '', notes: '',
  });
  const [manualIngredients, setManualIngredients] = useState(['']);
  const [manualEquipments, setManualEquipments] = useState(['']);
  const [manualStatus, setManualStatus] = useState('idle');
  const [manualError, setManualError] = useState('');

  async function handleUrlImport() {
    if (!urlVal.trim()) return;
    setUrlStatus('loading');
    setUrlError('');
    try {
      const { data } = await urlToJson(urlVal.trim());
      navigate('/review', { state: { parsed: data } });
    } catch (e) {
      setUrlStatus('error');
      setUrlError(e.response?.data?.detail || 'Failed to import. Check the URL and try again.');
    }
  }

  async function handleFileImport() {
    if (!file) return;
    setFileStatus('loading');
    setFileError('');
    try {
      const { data } = await uploadFileToJson(file);
      navigate('/review', { state: { parsed: data } });
    } catch (e) {
      setFileStatus('error');
      setFileError(e.response?.data?.detail || 'Failed to parse file. Try a different format.');
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setManualStatus('loading');
    setManualError('');
    try {
      const payload = {
        recipe: {
          title: manual.title,
          description: manual.description,
          instructions: manual.instructions,
          durationInMinutes: parseInt(manual.durationInMinutes, 10) || 0,
          serving: parseInt(manual.serving, 10) || 0,
          notes: manual.notes || null,
        },
        ingredients: manualIngredients.filter(Boolean).map((n) => ({ name: n })),
        equipments: manualEquipments.filter(Boolean).map((n) => ({ name: n })),
      };
      const { data } = await recipeToDB(payload);
      navigate(`/recipe/${data.id}`, { state: { saved: true } });
    } catch (e) {
      setManualStatus('error');
      setManualError(e.response?.data?.detail || 'Failed to save recipe.');
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
        Add a Recipe
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '32px' }}>
        Import from a URL, upload a file, or enter it manually.
      </p>

      <div style={{
        display: 'flex',
        background: '#EDE4D8',
        borderRadius: '10px',
        padding: '4px',
        marginBottom: '32px',
        width: 'fit-content',
      }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding: '8px 20px',
              borderRadius: '7px',
              border: 'none',
              background: tab === i ? '#fff' : 'transparent',
              color: tab === i ? 'var(--text)' : 'var(--muted)',
              fontWeight: tab === i ? 700 : 400,
              fontSize: '14px',
              transition: 'all 0.2s',
              boxShadow: tab === i ? '0 1px 4px rgba(44,26,14,0.10)' : 'none',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Recipe URL</label>
            <input
              type="url"
              value={urlVal}
              onChange={(e) => setUrlVal(e.target.value)}
              placeholder="https://www.allrecipes.com/recipe/..."
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUrlImport(); }}
            />
          </div>
          {urlError && (
            <div style={{ background: '#FEF0ED', border: '1px solid #F5C6B8', color: 'var(--accent)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>
              {urlError}
            </div>
          )}
          <button
            onClick={handleUrlImport}
            disabled={urlStatus === 'loading' || !urlVal.trim()}
            style={{
              background: urlStatus === 'loading' || !urlVal.trim() ? '#C4A898' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: urlStatus === 'loading' || !urlVal.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {urlStatus === 'loading' ? (<><Spinner />Importing...</>) : 'Import Recipe'}
          </button>
        </div>
      )}

      {tab === 1 && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '48px 32px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? '#FEF0ED' : 'var(--input-bg)',
              transition: 'all 0.2s',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📄</div>
            {file ? (
              <>
                <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{file.name}</p>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Click to change</p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Drop a file here</p>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>or click to browse — images, PDFs, text files</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.csv,.html" onChange={(e) => setFile(e.target.files[0])} />

          {fileError && (
            <div style={{ background: '#FEF0ED', border: '1px solid #F5C6B8', color: 'var(--accent)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>
              {fileError}
            </div>
          )}
          <button
            onClick={handleFileImport}
            disabled={fileStatus === 'loading' || !file}
            style={{
              background: fileStatus === 'loading' || !file ? '#C4A898' : 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '12px 28px', fontSize: '15px', fontWeight: 700,
              cursor: fileStatus === 'loading' || !file ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {fileStatus === 'loading' ? (<><Spinner />Processing...</>) : 'Parse File'}
          </button>
        </div>
      )}

      {tab === 2 && (
        <form onSubmit={handleManualSubmit} style={{ animation: 'fadeUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input required value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} placeholder="Recipe title" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Description *</label>
            <textarea required value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} placeholder="Brief description" rows={3} style={{ ...inputStyle, resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Instructions *</label>
            <textarea required value={manual.instructions} onChange={(e) => setManual({ ...manual, instructions: e.target.value })} placeholder="Step by step instructions..." rows={6} style={{ ...inputStyle, resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Duration (mins) *</label>
              <input required type="number" min="1" value={manual.durationInMinutes} onChange={(e) => setManual({ ...manual, durationInMinutes: e.target.value })} placeholder="30" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
            </div>
            <div>
              <label style={labelStyle}>Servings *</label>
              <input required type="number" min="1" value={manual.serving} onChange={(e) => setManual({ ...manual, serving: e.target.value })} placeholder="4" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Ingredients</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {manualIngredients.map((ing, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px' }}>
                  <input value={ing} onChange={(e) => {
                    const a = [...manualIngredients];
                    a[i] = e.target.value;
                    setManualIngredients(a);
                  }} placeholder={`Ingredient ${i + 1}`} style={{ ...inputStyle, flex: 1 }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
                  {manualIngredients.length > 1 && (
                    <button type="button" onClick={() => setManualIngredients(manualIngredients.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', color: 'var(--muted)', fontSize: '16px' }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setManualIngredients([...manualIngredients, ''])} style={{ background: 'none', border: '1.5px dashed var(--border)', borderRadius: '8px', padding: '9px', color: 'var(--muted)', fontSize: '14px', width: 'fit-content' }}>+ Add ingredient</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Equipment</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {manualEquipments.map((eq, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px' }}>
                  <input value={eq} onChange={(e) => {
                    const a = [...manualEquipments];
                    a[i] = e.target.value;
                    setManualEquipments(a);
                  }} placeholder={`Equipment ${i + 1}`} style={{ ...inputStyle, flex: 1 }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
                  {manualEquipments.length > 1 && (
                    <button type="button" onClick={() => setManualEquipments(manualEquipments.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', color: 'var(--muted)', fontSize: '16px' }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setManualEquipments([...manualEquipments, ''])} style={{ background: 'none', border: '1.5px dashed var(--border)', borderRadius: '8px', padding: '9px', color: 'var(--muted)', fontSize: '14px', width: 'fit-content' }}>+ Add equipment</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} placeholder="Any tips, substitutions, or notes..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
          </div>

          {manualError && (
            <div style={{ background: '#FEF0ED', border: '1px solid #F5C6B8', color: 'var(--accent)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
              {manualError}
            </div>
          )}

          <button
            type="submit"
            disabled={manualStatus === 'loading'}
            style={{
              background: manualStatus === 'loading' ? '#C4A898' : 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '13px 32px', fontSize: '15px', fontWeight: 700,
              cursor: manualStatus === 'loading' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content',
            }}
          >
            {manualStatus === 'loading' ? (<><Spinner />Saving...</>) : 'Save Recipe'}
          </button>
        </form>
      )}
    </div>
  );
}
