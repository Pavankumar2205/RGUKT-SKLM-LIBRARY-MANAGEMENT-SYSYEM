const express = require('express')
const app = express()
const body_parser = require('body-parser')
const mongoose = require('mongoose')
const org_routes= require('./routes/org_routes')
const user_routes = require('./routes/user_routes')
const dotenv=require('dotenv')

dotenv.config()

mongoose.connect(process.env.DB_CONNECT,{useNewUrlParser : true},console.log("connected to db"))

app.use(body_parser.json())
app.use(body_parser.urlencoded({extended:false}))
app.use('/org',org_routes)
app.use('/user',user_routes)

app.get('/',(req,res)=>{
    res.send("LMS")
})

app.listen(2018,console.log("listening on port 2018"))

