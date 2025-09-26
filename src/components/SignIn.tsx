import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const api = await import('../api');
      await api.default.signIn({ email, password });
      // TODO: handle success (redirect, show message, etc.)
    } catch (err) {
      // TODO: handle error (show error message)
      console.error(err);
    }
    setIsLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeInOut"
      }
    }
  };

  const formVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
        
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to continue your poker journey</p>
        </div>

        <motion.form 
          onSubmit={handleSubmit}
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="form-group" variants={itemVariants}>
            <input
              type="email"
              className="form-control"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </motion.div>

          <motion.div className="form-group" variants={itemVariants}>
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </motion.div>

          <motion.button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </motion.button>
          
          {/* Temporary Play Now button for demo */}
          <motion.div variants={itemVariants}>
            <Link 
              to="/game-selection" 
              className="btn btn-success"
              style={{ width: '100%', marginTop: '12px' }}
            >
              Play Now (Demo)
            </Link>
          </motion.div>
        </motion.form>

        <motion.div 
          className="auth-link"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignIn;