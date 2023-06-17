const jwt = require('jsonwebtoken')
const org_schema = require('../models/org_schema')

module.exports = async (req,res,next)=>{
    const token = req.header('auth-token')
    if(!token) res.status(400).send("Access Denied")

    try {
        console.log("13");
        const verified = await jwt.verify(token,process.env.TOKEN_SECRET_ORG)
        console.log(verified.org_mail);
        const org = await org_schema.findOne({org_mail:verified.org_mail})
        if(org.isverified === true){
            next()
        }
        else{
            res.send("Verify your mail to get access")
        }
    } catch (error) {
        res.status(400).send("Token not verified")
    }
}