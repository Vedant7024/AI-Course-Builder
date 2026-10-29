
const dns = require("node:dns");

// Use public DNS servers to resolve MongoDB Atlas SRV records.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    if (!process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET is missing in .env");
    }

    // Connect to MongoDB Atlas before starting the server.
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected database:", mongoose.connection.name);

    console.log("MongoDB connected successfully!");

    // Start the Express server only after a successful connection.
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
