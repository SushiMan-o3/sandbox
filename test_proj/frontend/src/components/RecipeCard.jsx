import { useNavigate } from 'react-router-dom';

const CARD_COLORS = [
  '#E8D5C4',
  '#C4D8CC',
  '#D4C8E8',
  '#C8D8E8',
  '#E8D8C8',
  '#C8E8D4',
];

export default function RecipeCard({ recipe: recipeData, index = 0 }) {
  const navigate = useNavigate();
  const color = CARD_COLORS[index % CARD_COLORS.length];
  const { id, emoji, recipe } = recipeData;

  return (
    <div
      onClick={() => navigate(`/recipe/${id}`)}
      style={{
        background: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(44,26,14,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        height: '140px',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '56px',
      }}>
        {emoji}
      </div>

      <div style={{
        padding: '16px 20px 20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {recipe.title}
        </h3>

        <p style={{
          fontSize: '14px',
          color: 'var(--muted)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
        }}>
          {recipe.description}
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          {recipe.durationInMinutes && (
            <span style={{
              background: '#F5EDE4',
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              border: '1px solid #EDD8C8',
            }}>
              ⏱ {recipe.durationInMinutes} min
            </span>
          )}
          {recipe.serving && (
            <span style={{
              background: '#F0F5F0',
              color: 'var(--green)',
              fontSize: '12px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              border: '1px solid #D4E4D8',
            }}>
              👥 {recipe.serving} serving{recipe.serving !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
