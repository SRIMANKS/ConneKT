const mongoose = require("mongoose");

const formschema = new mongoose.Schema({
  name: { type: String, required: true },
  bestmemory: { type: String, required: true },
  youlike: { type: String, required: true },
  message: { type: String, required: true },
  email: { type: String, required: true },
  senderusername: { type: String, required: true },
  receiverusername: { type: String, required: true },
});

module.exports = mongoose.model("Form", formschema);
