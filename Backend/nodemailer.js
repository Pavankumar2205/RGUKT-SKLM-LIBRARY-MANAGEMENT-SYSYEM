const nodemailer = require('nodemailer')

const sendMail= async (email,subject,body)=>{
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            auth:{
                user:'charankasa02@gmail.com',
                pass:"yaynvybigbcnyyrd"
            }
        })

        await transporter.sendMail({
            from:'charankasa02@gmail.com',
            to:email,
            subject:subject,
            text:body
        })

        console.log("Email sent successfully");


    } catch (error) {
        console.log(error,"Email not sent succesfully");
    }
    
}
module.exports.sendMail = sendMail