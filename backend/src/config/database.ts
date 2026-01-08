import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb+srv://ridhamdev3:Ridham123%40@cluster0.zbksmdz.mongodb.net/ai-poker',
      {
        // Remove deprecated options for newer mongoose versions
      }
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
