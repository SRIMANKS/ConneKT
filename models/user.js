const mongoose = require("mongoose");

userschema = new mongoose.Schema({
username: { type: String, required: true, unique: true },
password: { type: String, required: true },
name: { type: String, required: true },
rollno: { type: String, required: true },
hostel: { type: String, required: true },
dept: { type: String, required: true },
email: { type: String, required: true },
});
module.exports = mongoose.model("User", userschema);
