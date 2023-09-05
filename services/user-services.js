const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userRepository = require("../repositories/user-repository");
const handleImageUpload = require("../config/cloudinary-config");
const helpers = require("../helpers");

const bcryptSalt = process.env.BCRYPT_SALT;

// user signup handler
const createUser = async (firstName, lastName, email, phone, gender, password, ninDocument) => {
  const oldUser =  await userRepository.doesUserExist(email);
  if(oldUser) return helpers.newError("Email already exist", 403)

  const OTPCode =  helpers.OTP()

  // upload nin to cloudinary and create account
  const nin = await handleImageUpload(ninDocument)
  const newUser = await userRepository.createNewUser(firstName, lastName, email, phone, gender, password, nin.secure_url);
  const registeredOTP = await userRepository.createRegisterOtp(email, OTPCode);

  return { newUser, registeredOTP };
};

// login user handler
const loginUser = async (email, password) => {
  const userInfo = await userRepository.doesUserExist(email);
  if(!userInfo) return helpers.newError("User doesn't exist", 404)  

  const isPasswordCorrect = await bcrypt.compare( password, userInfo.password);
  if (!isPasswordCorrect) return helpers.newError("Invalid credentials", 400)

  return userInfo
};

// forget password handler
const forgotPassword = async (email) => {
  const userInfo = await userRepository.getUserByEmail(email);
  if(!userInfo) return helpers.newError("User doesn't exist", 404)

  // find and delete previous OTP
  await userRepository.findOTP(email);
  await userRepository.deleteOTP(email)

  // implementing a reset token and hashing it using bcrypt
  let resetOTP = crypto.randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(resetOTP, Number(bcryptSalt));

  await userRepository.createResetOtp(email, hash)

  return {userInfo, resetOTP};
};

// reset password handler
const resetPassword = async (email, OTP, password) => {
  const userInfo = await userRepository.getUserByEmail(email);
  if(!userInfo) return helpers.newError("User doesn't exist", 404)

  let passwordResetOTP = await userRepository.findResetOTP(email);
  if(passwordResetOTP == null) return helpers.newError("password reset OTP expired", 404)

  const isValid = await bcrypt.compare(OTP, passwordResetOTP.OTP);
  if (!isValid) return helpers.newError("Invalid or expired reset token", 404);

  // hash the new password
  const hash = await bcrypt.hash(password, Number(bcryptSalt));

  await userRepository.updateUserProfile(email, {password: hash})
  await userRepository.deleteResetOTP(email);
};

// verify OTP handler
const verifyUser = async (email, OTP) => {
  const user =  await userRepository.getUserByEmail(email, "email");
  if (user == null) return helpers.newError("User does not exist", 404);

  // check if codeVerification is valid
  const OTPCode = await userRepository.findOTP(email);
  
  if (OTPCode == null) return helpers.newError("Invalid or expired OTP", 404)
  if (OTP !== OTPCode.OTP) return helpers.newError("OTP was not successfully verified") 

  await userRepository.updateUserProfile(email, {isVerified: true});
  await userRepository.deleteOTP(email)
}

// resend OTP handler
const resendOtp = async (email) => {
  const OTP = helpers.OTP()
  const user =  await userRepository.getUserByEmail(email, "email");

  if(user == null) return helpers.newError("User does not exist", 404)
  await userRepository.createRegisterOtp(user.email, OTP)
  
  return {OTP, user}
};


// update account handler
const updateAccount = async(email, body) => {
  const isProfileUpdated =  await userRepository.updateUserProfile(email, body)

  if(!isProfileUpdated)
    return helpers.newError("could not update user profile", 500)

  
  return isProfileUpdated  
}

module.exports = {
  createUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyUser,
  resendOtp,
  updateAccount
};