import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 3 + 1,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          alpha: Math.random() * 0.4 + 0.15,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,98,45,${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    function onResize() {
      resize();
      initParticles();
    }

    resize();
    initParticles();
    draw();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '64px',
        background: 'var(--navbar)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>📖</span>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            fontWeight: 700,
            color: '#FAF6EE',
          }}>Recipe Vault</span>
        </div>
        <Link to="/home" style={{
          background: 'var(--accent)', color: '#fff', fontSize: '14px',
          borderRadius: '8px', padding: '8px 18px', fontWeight: 700,
        }}>Browse Recipes</Link>
      </nav>

      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: '64px',
      }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
        <div style={{
          position: 'relative',
          textAlign: 'center',
          padding: '0 24px',
          animation: 'fadeUp 0.8s ease forwards',
          maxWidth: '680px',
        }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            color: 'var(--accent)',
            fontSize: '18px',
            marginBottom: '16px',
            letterSpacing: '0.5px',
          }}>
            Your personal recipe collection
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(48px, 8vw, 80px)',
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}>
            Recipe Vault
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'var(--muted)',
            lineHeight: 1.7,
            marginBottom: '40px',
            fontWeight: 300,
          }}>
            Save recipes from anywhere — paste a URL, scan a photo, or type it in yourself.
            AI extracts the details so you can focus on cooking.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/home" style={{
              background: 'var(--accent)',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 700,
              display: 'inline-block',
            }}>
              Browse Recipes
            </Link>
            <Link to="/add" style={{
              background: 'transparent',
              color: 'var(--text)',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 700,
              border: '2px solid var(--border)',
              display: 'inline-block',
            }}>
              Add a Recipe
            </Link>
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', padding: '80px 32px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '36px',
            fontWeight: 700,
            color: 'var(--text)',
            textAlign: 'center',
            marginBottom: '12px',
          }}>
            Save recipes your way
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '16px', marginBottom: '56px' }}>
            Three ways to add recipes, one beautiful place to keep them.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '28px',
          }}>
            {[
              { icon: '🔗', title: 'Import from URL', desc: 'Paste any recipe link and we\'ll scrape and parse it automatically using AI.' },
              { icon: '📄', title: 'Scan a File', desc: 'Upload a photo, PDF, or document of a recipe and AI extracts every detail.' },
              { icon: '✍️', title: 'Type it Yourself', desc: 'Manually enter recipes from your head or an old cookbook with full editing control.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'var(--bg)',
                border: '1.5px solid var(--border)',
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
                animation: 'popIn 0.5s ease both',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>{icon}</div>
                <h3 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: '10px',
                }}>
                  {title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--navbar)', padding: '80px 32px', textAlign: 'center' }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '36px',
          fontWeight: 700,
          color: '#FAF6EE',
          marginBottom: '16px',
        }}>
          Start building your vault
        </h2>
        <p style={{ color: '#EDE4D8', fontSize: '16px', marginBottom: '32px', opacity: 0.8 }}>
          Your recipes, wherever you found them.
        </p>
        <Link to="/home" style={{
          background: 'var(--accent)',
          color: '#fff',
          padding: '14px 40px',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 700,
          display: 'inline-block',
        }}>
          Get Started
        </Link>
      </section>
    </div>
  );
}
