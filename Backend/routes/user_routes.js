const express=require("express")
const router=express.Router()
const user_schema=require("../models/user_schema")
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")
const verify=require("../verifications/user_verification")
const path=require("path")
const multer = require('multer')
const {sendMail}= require("../nodemailer")
const bookings=require("../models/bookings")
const books=require("../models/books_schema")
const otp_schema=require("../models/otp_schema")
const {registerValidation,loginValidation}=require("../validations/user_validation")
const instorage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"lib_uploads")
    },
    filename:(req,file,cb)=>{
        cb(null, Date.now() + '-' + file.originalname)
    }
})
const upload=multer({storage:instorage})
router.get("/get_data/:user_name",verify,async (req,res)=>{
    const data=await user_schema.findOne({user_name:req.params.user_name})
    res.send(data)
});
router.get("/get-bookings-data/:user_name",verify,async(req,res)=>{
    const userexist=await user_schema.findOne({user_name:req.params.user_name})
    const data1={};
    const data=await bookings.find({user:userexist._id}).populate('book','title').populate('org','org_name')
    const due_date=new Date();
    // const issue_date=data1.issue_date
    // due_date.setDate(issue_date.getDate()+7)//Considering 7 is the max days of limit to return a book
    res.send({data,due_date})
})
router.post("/bookings",async(req,res)=>{
    const {book_id,org_id,user_id}=req.body
    const data=await books.findById(book_id)
    const body=`Your booking is registered for the ${data.title} book`
    const subject="Booking registed"
    const data1=await user_schema.findById(user_id)
    if(data.copies!=0){
    // const user_name=verify.user_name
    await bookings.insertMany({book:book_id,user:user_id,org:org_id})
    sendMail(data1.mail,subject,body)
    // await books.findOneAndUpdate({title:title,org_name:org_name},{$inc:{copies:-1}})
    }
    else{
        res.send("Book is currently unavailable")
    }
})
router.post("/register",upload.single("profile"),async(req,res,file)=>{
    const {error,value }= registerValidation(req.body);
    if(error) return res.status(400).send(error.details[0].message)
    //checking if email exists or  not
    const emailexist= await user_schema.findOne({mail:req.body.email})
    if(emailexist) return res.status(400).send("Email already exist")
    const user_name_exist= await user_schema.findOne({user_name:req.body.user_name})
    if(user_name_exist) return res.status(400).send("user_name already exist")
    //hashing password
    const salt=await bcrypt.genSalt(10);
    const hashedpassword= await bcrypt.hash(req.body.password,salt)
    console.log(req.file.filename);
    try{
       
        // const newotp=new otp_schema({
        //     mail:req.body.mail,
        //     otp:otp1
        // })
        const usernew=new user_schema({
            user_name:req.body.user_name,
            mail:req.body.mail,
            password:hashedpassword,
            branch:req.body.branch,
            ph_no:req.body.ph_no,
            profile:req.file.filename
        })
        if(req.body.password==req.body.reenter_password){
            await usernew.save()
            res.redirect(`/send-otp/${req.body.mail}`)
        }
        else{
            res.send("password nor matched")
        }
    }
    catch(err){
        res.send(err.message)
    }
});
router.get("/send-otp/:mail",async(req,res)=>{
    //generating 6 or 7 digit otp
    const otp = Math.floor(100000 + Math.random()*900000)
    const subject = "OTP for Verification"
    const text = "Please enter this otp to get verified"+otp+"it will get expired in 10 minutes"
    sendMail(req.params.mail,subject,text);
    const date = new Date();
    const expiresIn = new Date();
    expiresIn.setTime(date.getTime() + 10 * 60 * 1000);
    // console.log(expiresIn)
    const new_otp = new otp_schema({
        otp,
        mail:req.params.mail,
        expiresIn
    })

    try {
        const data = await otp_schema.findOne({mail:req.params.mail})
        if(!data) {await new_otp.save()}
        else {await otp_schema.findOneAndUpdate({mail:req.params.mail},{$set : {otp,expiresIn}},{new : true})}
    } catch (error) {
        res.send(error)
    }
})
router.post('/otp-verification/:mail',async (req,res)=>{
    const mail1 = req.params.mail
    const otp = req.body.otp
    const data = await otp_schema.findOne({mail:mail1})
    if(!data) return res.status(400).send("No otp found for your mail")
    try {
        if(data.expiresIn<= new Date().getTime()) return res.status(400).send("OTP expired")
        if(otp === data.otp){
            await user_schema.findOneAndUpdate({mail:mail1},{$set:{isverified:true}})
            data= await user_schema.findOne({mail:mail1})
            const token= await jwt.sign({user_name:data.user_name},process.env.TOKEN_SECRET);
            res.setHeader("auth-token",token).send({token:token})   
        }
        else{
            res.send("OTP that you have entered is wrong")
        }
    } catch (error) {
        res.send(error)
    }
})
router.post("/login",async(req,res)=>{
    const {error}=loginValidation(req.body);
    if(error) return res.status(400).send(error.details[0].message)
    //checking if user_name exists or  not
    const user_name_exist= await user_schema.findOne({user_name:req.body.user_name})
    if(!user_name_exist) return res.status(400).send("user name is not found")
    //Verification check
    if(user_name_exist.isverified!=true) return res.send("Email verification is not done")
    //password validation
    const validPass=await bcrypt.compare(req.body.password,user_name_exist.password)
    if(!validPass) return res.send("invalid password!")
    //token generation
    const token=jwt.sign({user_name:user_name_exist.user_name},process.env.TOKEN_SECRET);
    res.header("auth-token",token).send(token)
});
router.post("/forgotpassword",async(req,res)=>{
    mail1=req.body.mail
    try{
        const isuser=await user_schema.findOne({mail:mail1})
        if(!isuser){
            return res.send("User not exists!")
        }
        const secret=process.env.TOKEN_SECRET+isuser.password
        const token=jwt.sign({user_name:isuser.user_name},secret,{expiresIn:"5m"})
        const link=`http://localhost:2018/user/reset-password/${isuser.user_name}/${token}`
        const subject = "Reset Password"
        await sendMail(isuser.mail,subject,link)
        res.send(link)
    }
    catch(err){
        res.send(err.message)
    }
})
router.get("/reset-password/:user_name/:token",async(req,res)=>{
    const user_name2=req.params.user_name
    const token1=req.params.token
    const isuser=await user_schema.findOne({user_name:user_name2})
    if(!isuser){
        return res.send("User not exist!")
    }
    const secret=process.env.TOKEN_SECRET+isuser.password
    try{
        const verify1=jwt.verify(token1,secret)
        res.sendFile(path.join(__dirname,"..","/files","/index.html"))
    }
    catch(error){
        res.send("Not verified")
        console.log(error)
        
    }
})
router.post("/reset-password/:user_name/:token",async(req,res)=>{
    const user_name2=req.params.user_name
    const token2=req.params.token
    const isuser=await user_schema.findOne({user_name:user_name2})
    if(!isuser){
        return res.send("User not exist!")
    }
    const password = req.body.password
    const password1 = req.body.confirm_password
    if(password == password1)
    {
        try{
        const secret = process.env.TOKEN_SECRET+ isuser.password
        const verify = jwt.verify(token2,secret)
        const hashPassword = await bcrypt.hash(password,10)
        await user_schema.findOneAndUpdate({user_name:user_name2},{$set :{password:hashPassword}})
        res.status(200).send({status:"Success",message:"Password updated succesfully"})
        }
        catch(err){
            res.send(err.message)
        }
    }
    else{
        res.send("Password didtn't matched")
    }
})
router.post("/delete",async(req,res)=>{
    const user_name_exist= await user_schema.findOne({user_name:req.body.user_name})
    if(!user_name_exist) return res.status(400).send("user name is not found")
    const validPass=await bcrypt.compare(req.body.password,user_name_exist.password)
    if(!validPass) return res.send("invalid password!")
    else{
        user_schema.deleteOne({user_name:req.body.user_name},function(err,obj){
            if(err){
                res.send(err.message)
            }
        })
        res.send("deleted successfully")
    }
})
module.exports=router