import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode, PaletteName } from './types';

export interface ThemeColors {
  bg: string;
  card: string;
  primary: string;
  accent: string;
  text: string;
}

export const PALETTES: Record<'Blue-Ocean' | 'Green-Pao', { light: ThemeColors; dark: ThemeColors }> = {
  'Blue-Ocean': {
    light: {
      bg: '#E3F2FD',
      card: '#FFFFFF',
      primary: '#2196F3',
      accent: '#90CAF9',
      text: '#0D47A1',
    },
    dark: {
      bg: '#0B192C',
      card: '#1E3E62',
      primary: '#2196F3',
      accent: '#90CAF9',
      text: '#E3F2FD',
    },
  },
  'Green-Pao': {
    light: {
      bg: '#E8F5E9',
      card: '#FFFFFF',
      primary: '#2A835F',
      accent: '#8BBB92',
      text: '#092328',
    },
    dark: {
      bg: '#092328',
      card: '#12544F',
      primary: '#2A835F',
      accent: '#8BBB92',
      text: '#E8F3EC',
    },
  },
};

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  palette: PaletteName;
  setPalette: (p: PaletteName) => void;
  isDark: boolean;
  setIsDark: (d: boolean) => void;
  colors: ThemeColors;
  updateCustomColor: (key: keyof ThemeColors, value: string) => void;
  resetToDefault: () => void;
  glassCardBg: (opacity?: number) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('PKP_THEME') as ThemeMode) || 'Casual';
  });

  const [palette, setPaletteState] = useState<PaletteName>(() => {
    return (localStorage.getItem('PKP_PALETTE') as PaletteName) || 'Blue-Ocean';
  });

  const [isDark, setIsDarkState] = useState<boolean>(() => {
    return localStorage.getItem('PKP_DARK') === 'true';
  });

  const [customColors, setCustomColors] = useState<Partial<ThemeColors>>(() => {
    try {
      const s = localStorage.getItem('PKP_CUSTOM_COLORS');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  // Calculate effective colors
  const activePreset = palette === 'Custom' 
    ? PALETTES['Blue-Ocean'] 
    : (PALETTES[palette] || PALETTES['Blue-Ocean']);
  const baseColors = isDark ? activePreset.dark : activePreset.light;

  const colors: ThemeColors = {
    bg: customColors.bg || baseColors.bg,
    card: customColors.card || baseColors.card,
    primary: customColors.primary || baseColors.primary,
    accent: customColors.accent || baseColors.accent,
    text: customColors.text || baseColors.text,
  };

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem('PKP_THEME', t);
  };

  const setPalette = (p: PaletteName) => {
    setPaletteState(p);
    localStorage.setItem('PKP_PALETTE', p);
    if (p !== 'Custom') {
      setCustomColors({});
      localStorage.removeItem('PKP_CUSTOM_COLORS');
    }
  };

  const setIsDark = (d: boolean) => {
    setIsDarkState(d);
    localStorage.setItem('PKP_DARK', String(d));
  };

  const updateCustomColor = (key: keyof ThemeColors, value: string) => {
    const updated = { ...customColors, [key]: value };
    setCustomColors(updated);
    setPaletteState('Custom');
    localStorage.setItem('PKP_PALETTE', 'Custom');
    localStorage.setItem('PKP_CUSTOM_COLORS', JSON.stringify(updated));
  };

  const resetToDefault = () => {
    setThemeState('Casual');
    setPaletteState('Blue-Ocean');
    setIsDarkState(false);
    setCustomColors({});
    localStorage.setItem('PKP_THEME', 'Casual');
    localStorage.setItem('PKP_PALETTE', 'Blue-Ocean');
    localStorage.setItem('PKP_DARK', 'false');
    localStorage.removeItem('PKP_CUSTOM_COLORS');
  };

  // Helper hex to rgb
  const hexToRgb = (hex: string) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  // Inject CSS Variables on <html> element
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg', colors.bg);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--text', colors.text);

    // Derived glow & mesh colors
    try {
      const pRgb = hexToRgb(colors.primary);
      const aRgb = hexToRgb(colors.accent);
      root.style.setProperty('--primary-glow', `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.35)`);
      root.style.setProperty('--primary-light', `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.12)`);
      root.style.setProperty('--mesh-blob-1', `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${isDark ? 0.18 : 0.12})`);
      root.style.setProperty('--mesh-blob-2', `rgba(${aRgb.r}, ${aRgb.g}, ${aRgb.b}, ${isDark ? 0.14 : 0.10})`);
    } catch {
      root.style.setProperty('--primary-glow', 'rgba(33, 150, 243, 0.35)');
      root.style.setProperty('--primary-light', 'rgba(33, 150, 243, 0.12)');
      root.style.setProperty('--mesh-blob-1', 'rgba(33, 150, 243, 0.12)');
      root.style.setProperty('--mesh-blob-2', 'rgba(144, 202, 249, 0.10)');
    }

    // Apply class for Theme Style
    root.classList.remove('theme-casual', 'theme-profesional', 'theme-glass');
    root.classList.add(`theme-${theme.toLowerCase()}`);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [colors, theme, isDark]);

  const glassCardBg = (opacity: number = 0.7): string => {
    if (theme !== 'Glass') return colors.card;
    if (isDark) {
      // In dark mode + Glass theme: use deep dark glass card
      const darkAlpha = Math.min(0.96, opacity + 0.15);
      return `rgba(18, 30, 49, ${darkAlpha})`;
    }
    return `rgba(255, 255, 255, ${opacity})`;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        palette,
        setPalette,
        isDark,
        setIsDark,
        colors,
        updateCustomColor,
        resetToDefault,
        glassCardBg,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
};
