import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navigation = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (!isHomePage) {
    return null;
  }

  return (
    <motion.nav 
      className="nav"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container nav-container">
        <Link to="/" className="logo">
          🎯 AI Poker Pro
        </Link>
        <div className="nav-buttons">
          <Link to="/signin" className="btn btn-outline">
            Sign In
          </Link>
          <Link to="/signup" className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;