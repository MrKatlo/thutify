import { useState, useEffect } from 'react';

export type RouteName = 
  | 'landing'
  | 'signup-institution'
  | 'find-institution'
  | 'platform-admin'
  | 'institution-login'
  | 'institution-admin'
  | 'student-signup'
  | 'not-found';

export interface RouteInfo {
  name: RouteName;
  params: {
    institutionSlug?: string;
  };
}

export function parsePath(path: string): RouteInfo {
  const cleanPath = '/' + path.replace(/^\/+|\/+$/g, ''); // Ensure format "/path"
  
  if (cleanPath === '/' || cleanPath === '') {
    return { name: 'landing', params: {} };
  }
  
  if (cleanPath === '/signup-institution') {
    return { name: 'signup-institution', params: {} };
  }
  
  if (cleanPath === '/find-institution') {
    return { name: 'find-institution', params: {} };
  }
  
  if (cleanPath === '/platform-admin') {
    return { name: 'platform-admin', params: {} };
  }
  
  // Pattern: /:slug/sub-route
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length === 2) {
    const [slug, subRoute] = parts;
    if (subRoute === 'login') {
      return { name: 'institution-login', params: { institutionSlug: slug } };
    }
    if (subRoute === 'admin') {
      return { name: 'institution-admin', params: { institutionSlug: slug } };
    }
    if (subRoute === 'student-signup') {
      return { name: 'student-signup', params: { institutionSlug: slug } };
    }
  }
  
  return { name: 'not-found', params: {} };
}

// Global listeners registry to support multiple router hook instances in synchronization
const listeners = new Set<() => void>();

export function navigate(path: string) {
  window.history.pushState(null, '', path);
  listeners.forEach(listener => listener());
}

export function useRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleUpdate = () => {
      setCurrentPath(window.location.pathname);
    };

    listeners.add(handleUpdate);
    window.addEventListener('popstate', handleUpdate);

    return () => {
      listeners.delete(handleUpdate);
      window.removeEventListener('popstate', handleUpdate);
    };
  }, []);

  const route = parsePath(currentPath);

  return {
    currentPath,
    route,
    navigate
  };
}
