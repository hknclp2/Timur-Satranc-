import { useState, useEffect, useCallback, useRef } from 'react';
import { useUnityContext } from 'react-unity-webgl';

export function useUnityBridge() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const demoRunningRef = useRef(false);

  const {
    unityProvider,
    sendMessage,
    loadingProgression,
    isLoaded,
  } = useUnityContext({
    loaderUrl: '/unity/Build.loader.js',
    dataUrl: '/unity/Build.data',
    frameworkUrl: '/unity/Build.framework.js',
    codeUrl: '/unity/Build.wasm',
  });

  // Unity build'inin gerçekten var olup olmadığını ve SPA fallback olmadığını kontrol et
  useEffect(() => {
    fetch('/unity/Build.loader.js', { method: 'HEAD' })
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        setIsDemoMode(!(res.ok && !ct.includes('text/html')));
      })
      .catch(() => setIsDemoMode(true));
  }, []);

  // Demo modu yükleme simülasyonu
  useEffect(() => {
    if (isGameActive && isDemoMode && !demoLoaded && !demoRunningRef.current) {
      demoRunningRef.current = true;
      let progress = 0;
      const interval = setInterval(() => {
        progress = Math.min(progress + Math.floor(Math.random() * 15) + 5, 100);
        setDemoProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setDemoLoaded(true);
          demoRunningRef.current = false;
        }
      }, 200);
      return () => {
        clearInterval(interval);
        demoRunningRef.current = false;
      };
    }
  }, [isGameActive, isDemoMode, demoLoaded]);

  const startGame = useCallback(
    (mode: string) => {
      setIsGameActive(true);
      setDemoLoaded(false);
      setDemoProgress(0);
      if (!isDemoMode && isLoaded) {
        sendMessage('GameManager', 'StartGameMode', mode);
      }
    },
    [isDemoMode, isLoaded, sendMessage]
  );

  const exitGame = useCallback(() => {
    setIsGameActive(false);
    setDemoLoaded(false);
    setDemoProgress(0);
    if (!isDemoMode && isLoaded) {
      sendMessage('GameManager', 'ResetToMenu', '');
    }
  }, [isDemoMode, isLoaded, sendMessage]);

  return {
    unityProvider,
    sendMessage,
    isLoaded: isDemoMode ? demoLoaded : isLoaded,
    loadingProgression: isDemoMode ? demoProgress : Math.round(loadingProgression * 100),
    isDemoMode,
    isGameActive,
    startGame,
    exitGame,
  };
}
