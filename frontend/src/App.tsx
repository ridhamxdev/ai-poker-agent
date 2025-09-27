import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import GameSelection from './components/GameSelection';
import PokerGame from './components/PokerGame';
import Loading from './components/Loading';
import RequireAuth from './components/RequireAuth';
import PokerLobby from './components/PokerLobby';

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <SocketProvider>
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
        </Routes>
      </div>
    </SocketProvider>
  );
}

export default App;