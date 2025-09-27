import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { AIGameProvider } from './contexts/AIGameContext';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import GameSelection from './components/GameSelection';
import PokerGame from './components/PokerGame';
import Loading from './components/Loading';
import RequireAuth from './components/RequireAuth';
import PokerLobby from './components/PokerLobby';
import AIGameSetup from './components/AIGameSetup';
import Profile from './components/Profile';
import Stats from './components/Stats';

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <SocketProvider>
      <AIGameProvider>
        <div className="App">
          <Navigation />
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route 
            path="/game-selection" 
            element={
              <RequireAuth>
                <GameSelection />
              </RequireAuth>
            } 
          />
          <Route 
            path="/lobby" 
            element={
              <RequireAuth>
                <PokerLobby />
              </RequireAuth>
            } 
          />
          <Route 
            path="/game" 
            element={
              <RequireAuth>
                <PokerGame />
              </RequireAuth>
            } 
          />
          <Route 
            path="/poker-game" 
            element={
              <RequireAuth>
                <PokerGame />
              </RequireAuth>
            } 
          />
          <Route 
            path="/ai-game-setup" 
            element={
              <RequireAuth>
                <AIGameSetup />
              </RequireAuth>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            } 
          />
          <Route 
            path="/stats" 
            element={
              <RequireAuth>
                <Stats />
              </RequireAuth>
            } 
          />
        </Routes>
        </div>
      </AIGameProvider>
    </SocketProvider>
  );
}

export default App;