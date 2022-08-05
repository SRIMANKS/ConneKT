const mongoose = require("mongoose");
const userModel = require("./models/user");
const formModel = require("./models/form");
const bcrypt = require("bcrypt");

mongoose
  .connect(
    "mongodb://127.0.0.1:27017/connekt",
    { useNewUrlParser: true },
    { useUnifiedTopology: true }
  )
  .then(() => {
    console.log("connected to mongodb");
  })
  .catch((err) => console.log(err));

const name =[""]


async function create() {
  for (let i = 1; i < 6; i++) {
    const hashpass = await bcrypt.hash("12345", 12);
    const user1 = new userModel({
      username: "JD123",
      password: hashpass,
      name: ``
      rollno: 1001001,
      email: "JohnDoe@gmail.com",
    });
    await user1.save();
  }
}

create();
