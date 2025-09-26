import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import GameSelection from './components/GameSelection';
import PokerGame from './components/PokerGame';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/game-selection" element={<GameSelection />} />
          <Route path="/poker-game" element={<PokerGame />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;