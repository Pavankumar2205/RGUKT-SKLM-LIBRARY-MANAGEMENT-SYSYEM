const router = require('express').Router()
const org_schema= require('../models/org_schema')
const books_schema= require('../models/books_schema')
const {registervalidation,loginvalidation} = require('../validations/org_validation')
const bcrypt= require('bcrypt')
const multer = require('multer')
const path = require('path')
const xlsx= require('xlsx')
const { schema } = require('../models/org_schema')
const jwt = require('jsonwebtoken')
const org_verify = require('../verifications/org_verification')
const otp_schema = require('../models/otp_schema')
const bookings = require('../models/bookings')
const {sendMail} = require('../nodemailer')
var name;

//uploading file into lib_uploads with org_name as filename
const instorage = multer.diskStorage({
    destination :(req,file,cb)=>{
        cb(null,'lib_uploads')
    },
    filename:(req,file,cb)=>{
        cb(null,'abc.xlsx')
    }
})
const upload = multer({storage: instorage})

router.post('/create-org',upload.single('lib_file'),async (req,res,next)=>{
    
    const {error,value}= registervalidation(req.body)
    if(error) return res.status(400).send(error.details[0].message);
    
    const org_exist = await org_schema.findOne({org_name: req.body.org_name})
    if(org_exist) return res.status(400).send("Org name already exists");

        //hashing password
        const salt = await bcrypt.genSalt(10)
        const hashedpassword= await bcrypt.hash(req.body.password,salt)
        name = req.body.org_name
        
        const org = new org_schema({
            org_name:req.body.org_name,
            org_mail:req.body.org_mail,
            password:hashedpassword,
            telephone:req.body.telephone
        })
        
        try {
            file_name = req.body.org_name
            //reading xlsx file
            const wb = xlsx.readFile(path.join(__dirname,`../lib_uploads/abc.xlsx`))
            console.log("1");
            //reading sheets from the xlsx file
            sheets = wb.SheetNames
            const ws = wb.Sheets[sheets]
            //read sheet data and convert it into json
            var data = xlsx.utils.sheet_to_json(ws);
            
            await org.save();
            // await new_otp.save();
            const newdata =  await data.map(obj => ({ ...obj, org_name: org.org_name }))
            await books_schema.insertMany(newdata)
            // res.redirect(`/send-otp/${req.body.org_mail}`)
            res.send("Done")
            // const token = jwt.sign({org_mail:org.org_email},process.env.TOKEN_SECRET_ORG)
            // res.setHeader('auth-token',token).send({status:"success",message:"Organization registered succesfully",token : token})
        } 
        catch (error) {
            // await org_schema.deleteOne({org_name:org.org_name})
            res.send(error)

        }
});

router.post('/send-otp/:org_mail',async (req,res)=>{
    //generating 6 or 7 digit otp
    const otp = Math.floor(100000 + Math.random()*900000)
    const subject = "OTP for Verification"
    const text = "Please enter this otp to get verified"+otp+"it will get expired in 10 minutes"
    await sendMail(req.params.org_mail,subject,text)
    const date = new Date();
    const expiresIn = new Date();
    expiresIn.setTime(date.getTime() + 10 * 60 * 1000);
    // console.log(expiresIn)
    const new_otp = new otp_schema({
        otp,
        mail:req.params.org_mail,
        expiresIn
    })

    try {
        const data = await otp_schema.findOne({mail:req.params.mail})
        if(!data) {await new_otp.save()}
        else {await otp_schema.findOneAndUpdate({mail:req.params.org_mail},{$set : {otp,expiresIn}},{new : true})}
    } catch (error) {
        res.send(error)
    }
})

router.post('/otp-verification/:org_mail',async (req,res)=>{
        const org_mail1 = req.params.org_mail
        const otp = req.body.otp
        const data = await otp_schema.findOne({mail:org_mail1})
        if(!data) return res.status(400).send("No otp found for your mail")
        try {
            if(data.expiresIn<= new Date().getTime()) return res.status(400).send("OTP expired")
            if(otp === data.otp){
                await org_schema.findOneAndUpdate({org_mail:org_mail1},{$set:{isverified:true}},{new:true})
                const token = jwt.sign({org_mail:org_mail1},process.env.TOKEN_SECRET_ORG)
                res.setHeader('auth-token',token).send({status:"success",message:"Organization registered succesfully",token : token})   
            }
            else{
                // await org_schema.findOneAndDelete({org_mail:org_mail1})
                res.send("OTP that you have entered is wrong")
            }
        } catch (error) {
            res.send(error)
        }
})

// router.post('/resend-otp/:org_mail',async (req,res)=>{
//     const org_mail= req.params.org_mail
//     const otp1 = Math.floor(100000 + Math.random()*900000)
//     const subject = "OTP for verification"
//     const body = "Please enter this otp to get verified"+ otp1
//     await sendMail(org_mail,subject,body)
//     await otp_schema.findOneAndUpdate({mail:org_mail},{otp:otp1})
// })
router.post('/delete-org',async (req,res)=>{
        try {
            await org_schema.deleteOne({org_name : req.body.org_name})
            await books_schema.deleteMany({org_name : req.body.org_name})
            res.send("Org Deleted succesfully")
        } catch (error) {
            res.send(error)
        }
})

router.post('/login',async (req,res)=>{
        const {error,value} = loginvalidation(req.body)
        if(error) return res.status(400).send(error.details[0].message)

        const org_exist = await org_schema.findOne({org_mail:req.body.org_mail})
        if(!org_exist)  return res.status(400).send("Org doesnt exist")

        const validpass = await bcrypt.compare(req.body.password,org_exist.password)
        if(!validpass) return res.status(400).send("Invalid password")

        const token = await jwt.sign({org_email:org_exist.org_mail},process.env.TOKEN_SECRET_ORG)
        res.setHeader('auth-token',token).send({status:"Success",message:"Logged in succesfully",token:token})
})

router.patch('/update-books/:id',org_verify,async (req,res)=>{
    try {
        const book = await books_schema.findByIdAndUpdate(req.params.id,{$set : req.body},{new:true})
        res.send({message:"Book details updated succesfully",book : book})
    } catch (error) {
        res.send(error)
    }    
})

router.post('/add-book',org_verify,async (req,res)=>{
    const book = new books_schema({
        title:req.body.title,
        author:req.body.author,
        publication : req.body.publication,
        edition: req.body.edition,
        year:req.body.year,
        copies:req.body.copies,
        org_name : req.body.org_name
    })

    try {
        await book.save()
        res.status(200).send("Book added successfully")
    } catch (error) {
        res.send(error)
    }
})

router.get('/get/:org_name',async (req,res)=>{
    try {
        const books = await books_schema.find({org_name:req.params.org_name})
        res.status(200).send(books)
        
    } catch (error) {
        res.send(error)
    }
})

router.post('/delete-book/:id',org_verify,async(req,res)=>{
        try {
            await books_schema.findByIdAndDelete(req.params.id)
            res.status(200).send({status:"Success",message:"Book Deleted Succesfully"})
        } catch (error) {
            res.send(error)
        }
})

router.post('/forgot-password',async (req,res)=>{
        org_mail1 = req.body.org_mail
        try {
            const is_org = await org_schema.findOne({org_mail:org_mail1})
            if(!is_org) return res.status(400).send("Org doesn't exist")

            const secret = process.env.TOKEN_SECRET_ORG + is_org.password
            const token=jwt.sign({org_mail:is_org.org_mail},secret,{expiresIn:"5m"})
            const subject = "Reset Password"
            const link = `http://localhost:2018/org/reset-password/${org_mail1}/${token}`
            await sendMail(is_org.org_mail,subject,link)
        } catch (error) {
            res.status(400).send(error)
        }
})

router.get('/reset-password/:org_mail1/:token',async (req,res)=>{
    const {org_mail1,token1} = req.params
    try {
        const is_org = await org_schema.findOne({org_mail:org_mail1})
        if(!is_org) return res.status(400).send("Org doesn't exist")
         
        const secret = process.env.TOKEN_SECRET_ORG + is_org.password
        const verifyed = jwt.verify(token1,secret)
        if(verifyed){
        res.sendFile(path.join(__dirname,"..","/files","/index.html"))}
    } catch (error) {
        res.status(400).send(error)
    }
})

router.post('/reset-password/:org_mail1/:token1',async (req,res)=>{
    const {org_mail1,token1} = req.params
    try {
        const is_org = await org_schema.findOne({org_mail:org_mail1})
        if(!is_org) return res.status(400).send("Org doesn't exist")
        const password = req.body.password
        const password1 = req.body.confirm_password

        if(password === password1)
        {
            const secret = process.env.TOKEN_SECRET_ORG + is_org.password
            const verify = jwt.verify(token1,secret)
            const hashPassword = await bcrypt.hash(password,10)
            await org_schema.findOneAndUpdate({org_mail:org_mail1},{$set :{password:hashPassword}})
            res.status(200).send({status:"Success",message:"Password updated succesfully"})

        }

        else{
            res.send("Password didtn't matched")
        }
    } catch (error) {
        res.send(error)
    }
    
})

router.get('/pending/:org_id',org_verify,async (req,res)=>{
    try {
        const books = await bookings.find({isIssued:false,isAccepted:false,_id:req.params.org_id }).populate('book','title author publication').populate('user','user_name mail ph_no').populate('org','org_name')
        res.status(200).send([books[0].book.title,books[0].book.author,books[0].book.publication,books[0].user.user_name,books[0].user.mail,books[0].user.ph_no,books[0].org.org_name])
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.post('/pending',async (req,res)=>{
    const {id,book_id} = req.body
    try {
        await bookings.findByIdAndUpdate(id,{$set:{isAccepted:true}},{new:true})
        await books_schema.findByIdAndUpdate(book_id,{$inc:{copies:-1}})
        res.send("Request Accepted")
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/accepted/:org_id',org_verify,async (req,res)=>{
    try {
        const books = bookings.find({isAccepted:true,isIssued:false,org:req.params.org_id}).populate('book','title author publication').populate('user','user_name mail ph_no').populate('org','org_name')
        res.status(200).send([books[0].book.title,books[0].book.author,books[0].book.publication,books[0].user.user_name,books[0].user.mail,books[0].user.ph_no,books[0].org.org_name])
    } catch (error) {
        res.send(error.message)
    }
})

router.post('/accepted',async (req,res)=>{
    const {id,exp_date} = req.body
    try {
        await bookings.findByIdAndUpdate(id,{$set:{isIssued:true,issued_date:new Date(),expire_date:exp_date}},{new:true})
        res.status(200).send("Book Issued")
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/issued/:org_id',org_verify,async (req,res)=>{
    try {
        const books = bookings.find({isAccepted:true,isIssued:true,org:req.params.org_id}).populate('book','title author publication').populate('user','user_name mail ph_no').populate('org','org_name')
        res.status(200).send([books[0].book.title,books[0].book.author,books[0].book.publication,books[0].user.user_name,books[0].user.mail,books[0].user.ph_no,books[0].org.org_name,books[0].issued_date,books[0].expire_date])
    } catch (error) {
        res.send(error.message)
    }
})

router.post('/return',org_verify,async(req,res)=>{
    const book_id =req.body.id
    try {
        const booking_id = req.body
        await bookings.findByIdAndUpdate(booking_id, {$set : {isReturned:true,return_date:new Date()}},{new:true})
        await books_schema.findByIdAndUpdate(book_id,{$inc:{copies:1}})
        res.send("Return done successfully ")
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/returned',org_verify,async(req,res)=>{
    try {
        const books = bookings.find({isReturned:true}).populate('book','title author publication').populate('user','user_name mail ph_no').populate('org','org_name')
        res.status(200).send([books[0].book.title,books[0].book.author,books[0].book.publication,books[0].user.user_name,books[0].user.mail,books[0].user.ph_no,books[0].org.org_name,books[0].issued_date,books[0].expire_date,book[0].return_date])
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/not-returned',org_verify,async (req,res)=>{
    try {
        const books = bookings.find({isAccepted:true,isIssued:true,isReturned:false}).populate('book','title author publication').populate('user','user_name mail ph_no').populate('org','org_name')
        res.status(200).send([books[0].book.title,books[0].book.author,books[0].book.publication,books[0].user.user_name,books[0].user.mail,books[0].user.ph_no,books[0].org.org_name,books[0].issued_date,books[0].expire_date])
    } catch (error) {
        res.send(error.message)
    }
})

module.exports = router;