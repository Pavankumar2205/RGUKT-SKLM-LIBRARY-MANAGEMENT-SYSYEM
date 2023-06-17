const joi = require('joi')


const registervalidation = (data)=>{
    const schema= joi.object({
        org_name:joi.string().required(),
        org_mail:joi.string().required().email(),
        password:joi.string().required().min(8),
        telephone:joi.number()
    })
    return schema.validate(data)
}
const loginvalidation=(data)=>{
    const sch=joi.object({
        org_mail:joi.string().required().email(),
        password:joi.string().required().min(8)
    });
    
    return sch.validate(data)
}
module.exports.registervalidation = registervalidation
module.exports.loginvalidation = loginvalidation