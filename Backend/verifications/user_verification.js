const jwt=require("jsonwebtoken");

module.exports=async function(req,res,next){
    const token=await req.header("auth-token");
    if(!token) return res.status(400).send("Access denied")
    try{
        const verified=jwt.verify(token,process.env.TOKEN_SECRET);
        next();
    }
    catch(err){
        res.status(400).send("Invalid token")
    }
}