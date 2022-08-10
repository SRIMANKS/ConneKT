const express = require("express");
const app = express();
const mongoose = require("mongoose");
const formModel = require("./models/form");
const userModel = require("./models/user");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const methodOverride = require("method-override");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");


dotenv.config();

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

app.set("view engine", "ejs");
app.use("/views", express.static(__dirname + "/views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({ secret: "goodsecret" }));
app.use(methodOverride("_method"));
app.use(flash());

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

function verification(req, res, next) {
  try {
    const token = req.session.token;
    console.log(`Verifying ${token}`);
    if (typeof token == "undefined" || token == null) {
      throw new Error("Invalid token");
    }
    const user = jwt.verify(req.session.token, process.env.SECRET);
    if (typeof user == "undefined" || user == null) {
      throw new Error("Invalid token");
    }
    else{
      next();
    }
  } catch (e) {
    req.flash("info", "you must be logged in to view this page");
    res.redirect("/login");
  }
}


app.get("/login", async (req, res) => {
  console.log(`previous page is ${req.headers.referer}`);
  res.render("login", { message: req.flash("info") });
});

app.post("/login", async (req, res, next) => {
  try {
    const user = await userModel.findOne({ username: req.body.username });
    if (user) {
      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (isMatch) {
        const token = await jwt.sign(
          { username: req.body.username, userid: String(user._id) },
          process.env.SECRET,
          { expiresIn: "2h" }
        );
        req.session.token = token;
        console.log(`token is ${req.session.token}`);
        req.flash("success", "You are logged in");
        res.redirect("/");
      } else {
        req.flash("info", "Invalid username or password");
        res.redirect("/login");
      }
    } else {
      console.log("user not found");
      throw new Error("username or password is incorrect");
    }
  } catch (e) {
    next(e);
  }
});



app.get("/logout", (req, res) => {
  req.session.token = 0;
  req.flash("info", "you have been logged out");
  res.redirect("/login");
});
app.get("/register", (req, res) => {
  res.render("register", { message: req.flash("error") });
});

app.post("/register", async (req, res, next) => {
  try {
    // cheaking if user name aldready exist
    const user = await userModel.findOne({ username: req.body.username });

    if (!user) {
      const hashpass = await bcrypt.hash(req.body.password, 12);
      const newuser = new userModel({
        username: req.body.username,
        password: hashpass,
        name: req.body.name,
        rollno: req.body.rollno,
        hostel: req.body.hostel,
        dept: req.body.dept,
        email: req.body.email,
      });
      await newuser.save();
      const token = await jwt.sign(
        { username: req.params.username },
        process.env.SECRET,
        { expiresIn: "2h" }
      );
      req.session.token = token;
      res.redirect("/login");
    } else {
      req.flash("error", "user name already exist");
      res.redirect("/register");
    }
  } catch (e) {
    next(e);
  }
});



app.get("/user/:id", verification, async (req, res) => {
  const id = req.params.id;
  console.log(`id is ${id}`);
  const visitor = jwt.verify(req.session.token, process.env.SECRET);
  const owner = await userModel.findById(id);
  const senders = await formModel.find({ receiverusername: owner.username });
  res.render("userprofile", {
    senders: senders,
    visitor: visitor,
    owner: owner,
    message: req.flash("err"),
  });
});


app.get("/hostel/:name",async (req, res) => {
  const name = `^${req.params.name}$`;
  const listofusers = await userModel.find({"hostel":{'$regex': `${name}`,$options:'i'}});
  res.render("listofusers", {listofusers:listofusers,name:name});
});


app.get("/dept/:name",async (req, res) => {
  const name = req.params.name;
  const listofusers = await userModel.find({ dept: name });
  res.render("listofusers", { listofusers: listofusers,name:name});
});


app.get("/submit/:id", verification, async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = await userModel.findById(id);
    const username = user.username;
    const visitor = jwt.verify(req.session.token, process.env.SECRET);
    if (user) {
      if (visitor.username === username) {
        req.flash("err", "you cant reply to your questions ");
        res.redirect(`/user/${String(user._id)}`);
      }
      const form = await formModel.findOne({
        senderusername: visitor.username,
        receiverusername: username,
      });
      if (form) {
        req.flash("err", "aldready replied ");
        res.redirect(`/user/${String(user._id)}`);
      }
      res.render("form", { receiver: username, sender: visitor.username });
    } else {
      throw new Error("The user your looking for does not exit :(");
    }
  } catch (e) {
    next(e);
  }
});



app.post("/form", async (req, res, next) => {
  try {
    const form = new formModel({
      name: req.body.name,
      bestmemory: req.body.bestmemory,
      youlike: req.body.youlike,
      message: req.body.message,
      email: String(req.body.email),
      senderusername: req.body.sender,
      receiverusername: req.body.receiver,
    });
    await form.save();

    const newform = await formModel.findOne({
      senderusername: req.body.sender,
      receiverusername: req.body.receiver,
    });
    const id = String(newform._id);
    res.redirect(`/form/${id}`);
  } catch (e) {
    next(e);
  }
});

app.get("/form/:id", verification, async (req, res, next) => {
  try {
    const id = req.params.id;
    const form = await formModel.findById(id);
    const receiverusername = form.receiverusername;
    const receiver = await userModel.findOne({ username: receiverusername });
    const receiverid = String(receiver._id);
    const visitor = jwt.verify(req.session.token, process.env.SECRET);
    if (form) {
      res.render("showform", { form: form, visitor: visitor ,back: receiverid});
    } else {
      throw new Error("form not found ");
    }
  } catch (e) {
    next(e);
  }
});

app.delete("/form/:id", verification, async (req, res, next) => {
  console.log("deleted");
  const id = req.params.id;
  const back = req.body.back;
  await formModel.findByIdAndDelete(id);
  res.redirect(`/user/${back}`);
});


app.get("/0/verify", async (req, res, next) => {
  try {
    const token = req.session.token;
    if (token) {
      const user = await jwt.verify(token, process.env.SECRET);
      res.send(`Welcome ${user.username}`);
    } else {
      throw new Error("Not logged in");
    }
  } catch (e) {
    next(e);
  }
});



app.get("/", verification, (req, res) => {
  const user = jwt.verify(req.session.token, process.env.SECRET);
  console.log(`logged in user is ${user.username}`);
  res.render("home", { name: user.username, id: user.userid });
});

app.post("/", async (req, res,next) => {
  try{
  const name = req.body.name;
  const searchtype = req.body.searchtype;
  if(searchtype === "username"){
    if (name) {
      const user = await userModel.findOne({ username: name });
      if (user) {
        res.redirect(`/user/${String(user._id)}`);
      } else {
        throw new Error("The username you searched does not exist");
      }
  }
  else {
    res.redirect("/");
  }
}
else if(searchtype === "hostel"){
  res.redirect(`/hostel/${name}`);
} 
else if(searchtype === "dept"){
  res.redirect(`/dept/${name}`);
};
}catch(e){
  next(e);
}
});

// error handler function

app.use((err, req, res, next) => {
  res.render("error", { err: err.message });
  next(err);
});
