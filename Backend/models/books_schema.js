const mongoose = require("mongoose")

const schema = mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    author:{
        type:String,
        required:false,
        default:""
    },
    publication:{
        type:String,
        required:false,
        default:""
    },
    edition:{
        type:String,
        required:false,
        default:""
    },
    year:{
        type:Number,
        required:false
    },
    copies:{
        type:Number,
        required:true
    },
    org_name:{
        type:String,
        required:true
    }
    
},{collection:"books"});

module.exports = mongoose.model("books",schema)