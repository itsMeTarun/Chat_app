import { AuthProvider, AuthContext } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import '../styles/globals.css';
import Head from 'next/head';
import { useContext, useEffect, useState, useRef } from 'react';
import { Sun, Moon, Bell, BellOff } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ThemeToggle() {
  const { toggleTheme } = useContext(AuthContext);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  if (!mounted || toggleTheme === undefined) {
    return null;
  }

  const handleToggle = () => {
    toggleTheme();
    setIsDark(document.documentElement.classList.contains('dark'));
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed top-4 right-4 z-50 p-2.5 bg-white/30 dark:bg-black/30 backdrop-blur-lg rounded-full shadow-lg border border-white/20 dark:border-zinc-700/50 hover:bg-white/50 dark:hover:bg-black/50 transition-all duration-300 group"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-5 h-5 text-gray-700 dark:text-gray-200 group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}

function NotificationSoundToggle() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('notificationSound');
    if (saved !== null) {
      setSoundEnabled(saved === 'true');
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('notificationSound', String(next));
  };

  return (
    <button
      onClick={toggleSound}
      className="fixed top-4 right-20 z-50 p-2.5 bg-white/30 dark:bg-black/30 backdrop-blur-lg rounded-full shadow-lg border border-white/20 dark:border-zinc-700/50 hover:bg-white/50 dark:hover:bg-black/50 transition-all duration-300 group"
      aria-label={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
      title={soundEnabled ? 'Sound On' : 'Sound Off'}
    >
      {soundEnabled ? (
        <Bell className="w-5 h-5 text-blue-500 dark:text-blue-400" />
      ) : (
        <BellOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      )}
    </button>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>BaatCheet — Real-Time Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="description" content="A modern real-time chat application with reactions, file sharing, and more." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen animated-bg text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Component {...pageProps} />
          </div>
          <ThemeToggle />
          <NotificationSoundToggle />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="colored"
            className="mt-16"
          />
        </SocketProvider>
      </AuthProvider>
    </>
  );
}

export default MyApp;
