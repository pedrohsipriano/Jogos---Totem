import { useState, useEffect } from 'react';
import { getTheme } from '../../../../utils/themeManager.js';

export default function Logo({ className }) {
  const [logoSrc, setLogoSrc] = useState(() => getTheme()?.customLogo || null);
  const [logoHeight, setLogoHeight] = useState(() => getTheme()?.logoHeight || 80);

  useEffect(() => {
    const handleThemeChange = (e) => {
      setLogoSrc(e?.detail?.customLogo || null);
      setLogoHeight(e?.detail?.logoHeight || 80);
    };
    window.addEventListener('totem_theme_changed', handleThemeChange);
    return () => window.removeEventListener('totem_theme_changed', handleThemeChange);
  }, []);

  if (!logoSrc) return null;

  return (
    <img
      src={logoSrc}
      alt="Logo do Evento"
      className={className}
      style={{
        maxHeight: `${logoHeight}px`,
        maxWidth: '320px',
        objectFit: 'contain',
      }}
    />
  );
}

