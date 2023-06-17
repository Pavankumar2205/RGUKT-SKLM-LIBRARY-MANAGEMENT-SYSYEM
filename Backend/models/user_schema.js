const mongoose = require('mongoose')

const schema = mongoose.Schema({
    user_name:{
        type:String,
        required:true,
        min:6
    },
    mail:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true,
        min:8
    },
    ph_no:{
        type:String,
        required:true,
        min:10
    },
    profile:{
        type:String,
        required:false
    },
    branch:{
        type:String,
        min:3,
        required:true
    },
    otp:{
        type:Number,
        min:6
    },
    isverified:{
        type:Boolean,
        default:false
    }

},{collection:"users"})

module.exports=mongoose.model("users",schema)