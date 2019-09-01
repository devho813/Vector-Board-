const express = require("express");
const session = require("express-session");

const app = express();

app.use(session({
    secret: '11231231312',
    resave: false,
    saveUninitialized: true
}))

app.get("/auth/login", function(req, res){
    req.session.ids = "lee";
    res.redirect("/welcome");
})

app.get("/welcome", function(req, res){
    res.send("ih");
})

app.listen("3003", function(){
    console.log("connect 3003 port!");
})