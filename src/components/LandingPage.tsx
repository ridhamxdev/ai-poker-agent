import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const features = [
    {
      icon: '🤖',
      title: 'Advanced AI Opponents',
      description: 'Face off against sophisticated AI players with unique playing styles and adaptive strategies.'
    },
    {
      icon: '🎯',
      title: 'Real-time Strategy Analysis',
      description: 'Get instant feedback on your plays with our advanced poker strategy analyzer.'
    },
    {
      icon: '🏆',
      title: 'Progressive Tournaments',
      description: 'Climb the ranks in dynamic tournaments with increasing difficulty and rewards.'
    },
    {
      icon: '📊',
      title: 'Performance Tracking',
      description: 'Track your progress with detailed statistics and personalized improvement suggestions.'
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <motion.div 
          className="container hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={itemVariants}>
            Master Poker Against Advanced AI
          </motion.h1>
          <motion.p variants={itemVariants}>
            Experience the ultimate poker challenge with our cutting-edge AI opponents. 
            Sharpen your skills, learn new strategies, and become a poker champion.
          </motion.p>
          <motion.div variants={itemVariants}>
            <Link to="/game-selection" className="btn btn-primary">
              Start Playing Now
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Why Choose AI Poker Pro?
          </motion.h2>
          <motion.div 
            className="features-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;