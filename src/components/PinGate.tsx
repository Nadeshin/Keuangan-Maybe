import React, { useState, useEffect } from 'react';
import { callApi } from '../api';
import { useAppTheme } from '../themeContext';
import { ShieldCheck, AlertCircle, Delete, RefreshCw, KeyRound } from 'lucide-react';

interface PinGateProps {
  onSuccess: (token: string) => void;
}

export const PinGate: React.FC<PinGateProps> = ({ onSuccess }) => {
  const { colors, theme, isDark } = useAppTheme();
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lockedRemaining, setLockedRemaining] = useState<number>(0);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Countdown timer jika terkunci
  useEffect(() => {
    if (lockedRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockedRemaining(prev => {
        if (prev <= 1) {
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedRemaining]);

  const handleDigit = (digit: string) => {
    if (lockedRemaining > 0 || loading) return;
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 6) {
        submitPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (lockedRemaining > 0 || loading) return;
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    if (lockedRemaining > 0 || loading) return;
    setPin('');
    setErrorMsg('');
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const submitPin = async (inputPin: string) => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await callApi('verifyPin', { pin: inputPin });

      if (res.success && res.token) {
        sessionStorage.setItem('AUTH_TOKEN', res.token);
        onSuccess(res.token);
      } else {
        setPin('');
        triggerShake();
        setErrorMsg(res.error || 'PIN tidak valid.');
        if (res.locked || res.remainingSeconds) {
          setLockedRemaining(res.remainingSeconds || 300);
        }
      }
    } catch (err: any) {
      setPin('');
      triggerShake();
      setErrorMsg(err.message || 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Decorative ambient background bloom */}
      <div
        className="w-72 h-72 rounded-full absolute -top-12 -left-12 pointer-events-none filter blur-3xl opacity-30"
        style={{ backgroundColor: colors.primary }}
      />
      <div
        className="w-64 h-64 rounded-full absolute -bottom-8 -right-8 pointer-events-none filter blur-3xl opacity-20"
        style={{ backgroundColor: colors.accent }}
      />

      <div
        className={`w-full max-w-sm p-7 sm:p-8 theme-card transition-all relative z-10 ${
          isShaking ? 'animate-shake' : ''
        }`}
        style={{
          backgroundColor: isDark 
            ? 'rgba(18, 30, 49, 0.75)' 
            : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.88)'),
        }}
      >
        {/* Header Icon with glowing halo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div
              className="absolute inset-0 rounded-2xl filter blur-md opacity-60"
              style={{ backgroundColor: colors.primary }}
            />
            <div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg transition-transform"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
              }}
            >
              {lockedRemaining > 0 ? (
                <AlertCircle className="w-8 h-8 text-amber-200 animate-pulse" />
              ) : (
                <KeyRound className="w-8 h-8" />
              )}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight" style={{ color: colors.text }}>
            KoNotes
          </h1>
          <p className="text-xs font-semibold tracking-wider uppercase opacity-60 mt-0.5" style={{ color: colors.primary }}>
            Financial Recorder
          </p>
          <p className="text-xs sm:text-sm mt-2 opacity-70">
            {lockedRemaining > 0
              ? `Terkunci ${lockedRemaining} detik karena salah PIN 5x`
              : 'Masukkan 6 digit PIN keamanan'}
          </p>
        </div>

        {/* Animated Glowing PIN Dots */}
        <div className="flex justify-center items-center gap-3.5 mb-7">
          {[0, 1, 2, 3, 4, 5].map(idx => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className="w-3.5 h-3.5 rounded-full transition-all duration-200 relative"
                style={{
                  backgroundColor: isFilled ? colors.primary : 'transparent',
                  border: `2px solid ${isFilled ? colors.primary : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)')}`,
                  transform: isFilled ? 'scale(1.25)' : 'scale(1)',
                  boxShadow: isFilled ? `0 0 12px ${colors.primary}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl text-xs flex items-start gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Semi AI-slop Numpad Grid */}
        <div className="grid grid-cols-3 gap-3 select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              disabled={lockedRemaining > 0 || loading}
              onClick={() => handleDigit(num)}
              className="h-14 sm:h-16 rounded-2xl flex items-center justify-center font-display text-xl sm:text-2xl font-bold transition-all duration-150 btn-press disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-105 active:scale-95"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.65)',
                color: colors.text,
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              {num}
            </button>
          ))}

          {/* Tombol Clear */}
          <button
            type="button"
            disabled={lockedRemaining > 0 || loading || pin.length === 0}
            onClick={handleClear}
            className="h-14 sm:h-16 rounded-2xl flex items-center justify-center text-xs font-bold tracking-wider transition-all duration-150 btn-press disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
              color: colors.text,
            }}
          >
            RESET
          </button>

          {/* Tombol Digit 0 */}
          <button
            type="button"
            disabled={lockedRemaining > 0 || loading}
            onClick={() => handleDigit('0')}
            className="h-14 sm:h-16 rounded-2xl flex items-center justify-center font-display text-xl sm:text-2xl font-bold transition-all duration-150 btn-press disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-105 active:scale-95"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.65)',
              color: colors.text,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            0
          </button>

          {/* Tombol Backspace */}
          <button
            type="button"
            disabled={lockedRemaining > 0 || loading || pin.length === 0}
            onClick={handleDelete}
            className="h-14 sm:h-16 rounded-2xl flex items-center justify-center text-base font-semibold transition-all duration-150 btn-press disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
              color: colors.text,
            }}
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Delete className="w-5 h-5" />}
          </button>
        </div>

        {/* Footer Security Note */}
        <div className="mt-6 text-center text-[11px] opacity-60 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: colors.primary }} />
          <span>Server-Side PIN Gate • PRD v1.5</span>
        </div>
      </div>
    </div>
  );
};
