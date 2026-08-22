import { Check, LogOut } from 'lucide-react';
import type { FC, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { DEMO_USERS } from '../lib/constants.ts';
import { UserProfile } from '../types.ts';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdPayload {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  exp: number;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onSignOut: () => void;
  googleClientId?: string;
  googleOnly?: boolean;
}

export const GoogleAuthModal: FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onSignOut,
  googleClientId,
  googleOnly = false,
}) => {
  const [customName, setCustomName] = useState('');
  const [customEmail] = useState('');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [authError, setAuthError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !googleClientId) return;

    let attempts = 0;
    const renderGoogleButton = () => {
      if (!window.google?.accounts || !googleButtonRef.current) {
        attempts += 1;
        if (attempts < 20) window.setTimeout(renderGoogleButton, 150);
        else setAuthError('無法載入 Google 登入服務，請檢查網路後再試一次。');
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            try {
              if (!response.credential) throw new Error('Google 未回傳登入憑證');
              const encodedPayload = response.credential.split('.')[1];
              if (!encodedPayload) throw new Error('Google 登入憑證格式錯誤');
              const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(
                decodeURIComponent(
                  Array.from(
                    atob(normalized),
                    (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
                  ).join(''),
                ),
              ) as GoogleIdPayload;

              if (!payload.sub || !payload.email || payload.exp * 1000 <= Date.now()) {
                throw new Error('Google 登入憑證已失效');
              }

              onSelectUser({
                id: `google_${payload.sub}`,
                name: payload.name || payload.email.split('@')[0],
                email: payload.email,
                avatar:
                  payload.picture ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payload.email)}`,
                color: customColor,
              });
              setAuthError('');
              onClose();
            } catch (error) {
              setAuthError(error instanceof Error ? error.message : 'Google 登入失敗');
            }
          },
        });
        googleButtonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 380,
          locale: 'zh_TW',
        });
      } catch {
        setAuthError('Google 登入初始化失敗，請確認 Client ID 與允許的網域。');
      }
    };

    renderGoogleButton();
  }, [customColor, googleClientId, isOpen, onClose, onSelectUser]);

  if (!isOpen) return null;

  const handleCreateCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newUser: UserProfile = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      email: customEmail.trim() || `${customName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customName)}`,
      color: customColor,
    };

    onSelectUser(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        id="google-auth-modal"
        className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl flex flex-col gap-5 text-neutral-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Google 帳號與協作者身份</h3>
              <p className="text-xs text-neutral-400">所有新建與修改節點將標記建立者</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-11 h-11 rounded-full object-cover border-2 shadow"
            style={{ borderColor: currentUser.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-white text-sm truncate">{currentUser.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                目前登入
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate">{currentUser.email}</p>
          </div>
          <div
            className="w-4 h-4 rounded-full border border-white/20"
            style={{ backgroundColor: currentUser.color }}
            title="畫布游標代表色"
          />
        </div>

        {googleClientId ? (
          <div className="space-y-2">
            <div ref={googleButtonRef} className="flex min-h-10 justify-center" />
            {authError && <p className="text-xs text-rose-400 text-center">{authError}</p>}
            {currentUser.id.startsWith('google_') && (
              <button
                type="button"
                onClick={() => {
                  window.google?.accounts.id.disableAutoSelect();
                  onSignOut();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-800 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                登出 Google 帳號
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            尚未設定 Google OAuth Client ID。請設定 <code>GOOGLE_CLIENT_ID</code>（本機亦可使用{' '}
            <code>VITE_GOOGLE_CLIENT_ID</code>）。
          </div>
        )}

        {/* Quick Multi-user / Persona Switcher */}
        {!googleOnly && import.meta.env.DEV && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold">快速切換測試身份（測試多人同步）</span>
              <span className="text-[11px] text-indigo-400">一鍵切換游標</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DEMO_USERS.map((user) => {
                const isSelected = currentUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                        : 'bg-neutral-950/40 border-neutral-800 hover:bg-neutral-800/80 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border"
                        style={{ borderColor: user.color }}
                      />
                      <div>
                        <div className="font-medium text-xs text-white">{user.name}</div>
                        <div className="text-[11px] text-neutral-400">{user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: user.color }}
                      />
                      {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Persona / Google Email input */}
        {!googleOnly && import.meta.env.DEV && (
          <form
            onSubmit={handleCreateCustom}
            className="pt-2 border-t border-neutral-800 space-y-2.5 text-xs"
          >
            <span className="font-semibold text-neutral-400">或自訂 Google 協作者名稱</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="名稱 (例如: Kevin Google)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-950/60 border border-neutral-800 outline-none focus:border-indigo-500 text-neutral-200 text-xs"
              />
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-9 h-9 rounded-xl cursor-pointer border border-neutral-700 bg-transparent p-0"
                title="選擇畫布游標顏色"
              />
              <button
                type="submit"
                disabled={!customName.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
              >
                切換
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
