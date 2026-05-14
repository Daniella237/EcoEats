import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const ALLOWED = new Set(['/', '/cuisine', '/livreur', '/menu']);

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

type RouterValue = {
  readonly pathname: string;
  readonly navigate: (to: string, mode?: 'push' | 'replace') => void;
};

const RouterContext = createContext<RouterValue | null>(null);

export function AppRouterProvider({ children }: { readonly children: ReactNode }) {
  const [pathname, setPathname] = useState(() => {
    const p = normalizePath(window.location.pathname);
    if (!ALLOWED.has(p)) {
      window.history.replaceState(null, '', '/');
      return '/';
    }
    return p;
  });

  const navigate = useCallback((to: string, mode: 'push' | 'replace' = 'push') => {
    const raw = to.startsWith('/') ? to : `/${to}`;
    const next = normalizePath(raw);
    const target = ALLOWED.has(next) ? next : '/';
    if (mode === 'replace') {
      window.history.replaceState(null, '', target);
    } else {
      window.history.pushState(null, '', target);
    }
    setPathname(target);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const p = normalizePath(window.location.pathname);
      if (!ALLOWED.has(p)) {
        window.history.replaceState(null, '', '/');
        setPathname('/');
        return;
      }
      setPathname(p);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const value = useMemo(() => ({ pathname, navigate }), [pathname, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useAppRouter(): RouterValue {
  const v = useContext(RouterContext);
  if (!v) {
    throw new Error('useAppRouter doit être utilisé sous AppRouterProvider');
  }
  return v;
}

export function AppNavLink({
  to,
  end,
  className,
  children,
}: {
  readonly to: string;
  readonly end?: boolean;
  readonly className: string | ((opts: { isActive: boolean }) => string);
  readonly children: ReactNode;
}) {
  const { pathname, navigate } = useAppRouter();
  const target = normalizePath(to);
  const isActive = end ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
  const cn = typeof className === 'function' ? className({ isActive }) : className;

  return (
    <a
      href={target}
      className={cn}
      aria-current={isActive ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        navigate(target);
      }}
    >
      {children}
    </a>
  );
}
