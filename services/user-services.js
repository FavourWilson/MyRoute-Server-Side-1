const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userRepository = require("../repositories/user-repository");
const driverRepository = require("../repositories/driver-repository");
const handleImageUpload = require("../config/cloudinary-config");
const helpers = require("../helpers");

const bcryptSalt = process.env.BCRYPT_SALT;

// user signup handler
const createUser = async (
  firstName,
  lastName,
  email,
  phone,
  gender,
  password,
  ninDocument
) => {
  const oldUser = await userRepository.doesUserExist(email);
  if (oldUser) return helpers.newError("Email already exist", 403);

  const OTPCode = helpers.OTP();

  // upload nin to cloudinary and create account
  const nin = await handleImageUpload(ninDocument);
  if (!nin.secure_url) return helpers.newError("Could not upload nin", 500);

  const newUser = await userRepository.createNewUser(
    firstName,
    lastName,
    email,
    phone,
    gender,
    password,
    nin.secure_url
  );
  const registeredOTP = await userRepository.createRegisterOtp(email, OTPCode);

  return { newUser, registeredOTP };
};

// login user handler
const loginUser = async (email, password) => {
  const userInfo = await userRepository.doesUserExist(email);

  if (!userInfo) return helpers.newError("User doesn't exist", 404);
  const isPasswordCorrect = await bcrypt.compare(password, userInfo.password);

  if (!isPasswordCorrect) return helpers.newError("Invalid credentials", 400);
  if (userInfo.isVerified == false)
    return helpers.newError("Verify your email", 401);

  return userInfo;
};

// delete user
const deleteUser = async (email) => {
  const userInfo = await userRepository.doesUserExist(email);
  if (!userInfo) return helpers.newError("User doesn't exist", 404);

  await userRepository.deleteUserAccount(email);
};

// forget password handler
const forgotPassword = async (email) => {
  const userInfo = await userRepository.getUserByEmail(email);
  if (!userInfo)
    return helpers.newError(
      "User not found, Check email again or Register",
      404
    );

  // find and delete previous OTP
  await userRepository.findOTP(email);
  await userRepository.deleteOTP(email);

  // implementing a reset token and hashing it using bcrypt
  let resetOTP = crypto.randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(resetOTP, Number(bcryptSalt));

  await userRepository.createResetOtp(email, hash);
  await userRepository.updateUserProfile(email, { canResetPassword: true });

  return { userInfo, resetOTP };
};

// reset password handler
const resetPassword = async (email, OTP, password) => {
  const userInfo = await userRepository.getUserByEmail(email);
  if (!userInfo)
    return helpers.newError(
      "User not found, Check email again or Register",
      404
    );

  let passwordResetOTP = await userRepository.findResetOTP(email);

  if (passwordResetOTP == null) {
    await userRepository.updateUserProfile(email, { canResetPassword: false });
    return helpers.newError("password reset OTP expired", 404);
  }

  const isValid = await bcrypt.compare(OTP, passwordResetOTP.OTP);
  if (!isValid) return helpers.newError("Invalid or expired reset token", 404);

  // hash the new password
  const hash = await bcrypt.hash(password, Number(bcryptSalt));

  await userRepository.updateUserProfile(email, {
    password: hash,
    canResetPassword: false,
  });
  await userRepository.deleteResetOTP(email);
};

// verify OTP handler
const verifyUser = async (email, OTP) => {
  const user = await userRepository.getUserByEmail(email, "email");
  if (user == null) return helpers.newError("User does not exist", 404);

  // check if codeVerification is valid
  const OTPCode = await userRepository.findOTP(email);

  if (OTPCode == null) return helpers.newError("Invalid or expired OTP", 404);
  if (OTP !== OTPCode.OTP)
    return helpers.newError("OTP was not successfully verified");

  await userRepository.updateUserProfile(email, { isVerified: true });
  console.log("data");
  await userRepository.deleteOTP(email);
};

// resend OTP handler
const resendOtp = async (email) => {
  const OTP = helpers.OTP();
  const user = await userRepository.getUserByEmail(email, "email");

  if (user == null) return helpers.newError("User does not exist", 404);
  await userRepository.createRegisterOtp(user.email, OTP);

  return { OTP, user };
};

// create the user booking
const userBooking = async (
  userId,
  whereAreyouLeavingFrom,
  whereAreyouGoing,
  whenAreyouGoing,
  seatsAvailable,
  currentMapLocation,
  preferredRoute,
  whatTimeAreYouGoing
) => {

  // save the user info
  const userInfo =  await userRepository.getUserByID(userId)
  if(!userInfo)
    return helpers.newError("User does not exist", 404)

  // search for rides
  const searchRides = await driverRepository.searchForDrivers(
    whereAreyouGoing,
    whenAreyouGoing
  );

  // save user booking 
  const createUserBooking = await userRepository.saveUserBooking(
    userId,
    whereAreyouLeavingFrom,
    whereAreyouGoing,
    whenAreyouGoing,
    seatsAvailable,
    currentMapLocation,
    preferredRoute,
    whatTimeAreYouGoing
  );

  return {createUserBooking, searchRides};
};

// update account handler
const updateAccount = async (email, body) => {
  const isProfileUpdated = await userRepository.updateUserProfile(email, body);
  return isProfileUpdated;
};

module.exports = {
  createUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyUser,
  resendOtp,
  updateAccount,
  userBooking,
  deleteUser,
  userBooking
};
