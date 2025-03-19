const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
0
// Import Routes
const fileRoutes = require("./routes/authRoutes");
const authRoutes = require("./routes/authRoutes");

// Use Routes
app.use("/api/files", fileRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
