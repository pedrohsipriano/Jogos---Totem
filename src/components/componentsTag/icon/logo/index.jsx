import { useState, useEffect } from 'react';
import { getTheme } from '../../../../utils/themeManager.js';

export default function Logo({ className }) {
  const [logoSrc, setLogoSrc] = useState(() => getTheme()?.customLogo || '/images/logo.png');

  useEffect(() => {
    const handleThemeChange = (e) => {
      setLogoSrc(e?.detail?.customLogo || '/images/logo.png');
    };
    window.addEventListener('totem_theme_changed', handleThemeChange);
    return () => window.removeEventListener('totem_theme_changed', handleThemeChange);
  }, []);

  return <img src={logoSrc} alt="Logo" className={className} style={{ maxHeight: '100px', objectFit: 'contain' }} />;
}

