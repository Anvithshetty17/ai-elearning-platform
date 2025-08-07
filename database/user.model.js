// MongoDB User Schema
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: { type: String, enum: ["professor", "student"] },
  passwordHash: String
});

module.exports = mongoose.model("User", UserSchema);