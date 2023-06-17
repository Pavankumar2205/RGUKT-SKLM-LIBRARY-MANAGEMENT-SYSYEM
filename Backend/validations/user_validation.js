const joi=require("joi")

const registerValidation=(data)=>{
    const sch=joi.object({
        user_name:joi.string().required().min(6),
        mail:joi.string().required().email(),
        password:joi.string().required().min(8),
        branch:joi.string().required().min(3),
        ph_no:joi.string().required().min(10),
        reenter_password: joi.string().required()
    });
    
    return sch.validate(data)
}

const loginValidation=(data)=>{
    const sch=joi.object({
        user_name:joi.string().required().min(6),
        password:joi.string().required().min(8)
    });
    
    return sch.validate(data)
}
module.exports.registerValidation=registerValidation
module.exports.loginValidation=loginValidation