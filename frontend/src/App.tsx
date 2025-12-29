import { useState, useEffect } from 'react';
import { useAuthStore } from './stores';
import { AuthForm, ChatInterface, WorkflowsList, Sidebar } from './components';

function App() {
  const { token, user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'workflows'>('chat');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (token) {
        await checkAuth();
      }
      setIsInitialized(true);
    };
    init();
  }, [token, checkAuth]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTab === 'chat' ? 'Build Automation' : 'My Workflows'}
          </h2>
          <p className="text-sm text-gray-500">
            {activeTab === 'chat'
              ? 'Describe what you want to automate in plain English'
              : 'Manage and monitor your workflows'}
          </p>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatInterface />
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <WorkflowsList />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
