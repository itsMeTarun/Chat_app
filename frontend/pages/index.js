import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { motion } from 'framer-motion';

export default function Home() {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex">

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="
          flex w-full h-full
          overflow-hidden
          bg-transparent
        "
      >

        {/* SIDEBAR */}
        <div
          className={`
            ${selectedUser ? 'hidden md:flex' : 'flex'}
            w-full
            sm:w-[320px]
            md:w-[280px]
            lg:w-[320px]
            xl:w-[360px]
            flex-shrink-0
          `}
        >
          <Sidebar
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
          />
        </div>

        {/* CHAT */}
        <div
          className={`
            ${!selectedUser ? 'hidden md:flex' : 'flex'}
            flex-1 min-w-0
          `}
        >
          <ChatWindow
            selectedUser={selectedUser}
            onBack={() => setSelectedUser(null)}
          />
        </div>

      </motion.div>
    </div>
  );
}