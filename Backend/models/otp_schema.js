const mongoose= require("mongoose")

const schema = mongoose.Schema({

    otp:{
        type:Number,
        required:true
    },
    mail:{
        type:String,
        required:true
    },
    expiresIn: {
        type: Date,
        required: true
    }
}
    ,{collection:"otp"})

module.exports = mongoose.model("otp",schema)    