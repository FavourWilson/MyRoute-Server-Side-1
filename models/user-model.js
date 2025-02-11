const mongoose = require("mongoose");
const bcrypt = require("bcrypt")

const bcryptSalt = process.env.BCRYPT_SALT;

const UserSchema = new mongoose.Schema({
  profilePic: {
    type: String,
    default: null,
  },
  ninDocument: {
    type: String,
    default: null,
	  required: [true, "provide Government issued ID card (NIN / Drivers licence)"]
  },
  firstName: {
    type: String,
    required: [true, "firstname cannot be empty"],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, "lastName cannot be empty"],
  },
  email: {
    type: String,
    required: [true, "email cannot be empty"],
    unique: true
  },
  phone: {
    type: String,
    required: [true, "phone number cannot be empty"],
  },
  gender: {
    type: String,
    required: [true, "Gender cannot be empty"],
  },
  password: {
    type: String,
    required: [true, "Password cannot be empty"],
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  canResetPassword: { 
    type: Boolean,
    default: false
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "card",
    default: null
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "car",
    default: null
  },
  driverBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "driver-booking",
    default: null
  },
  paymentMethod: [{
    type: String,
    default: null,
  }],
  savedBooking: {
    whereAreyouLeavingFrom: {
      type: String,
      default: null
    },
    whereAreyouGoing: {
      type: String,
      default: null
    },
    whenAreyouGoing: {
      type: String,
      default: null
    },
    seatsAvailable: {
      type: Number,
      default: null
    },
    currentMapLocation: {
      type: String,
      default: null
    },
    preferredRoute: {
      type: String,
      default: null
    },
    whatTimeAreYouGoing: {
      type: String,
      default: null,
    }
  }
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const hash = await bcrypt.hash(this.password, Number(bcryptSalt));
  this.password = hash;
  next();
});

const User = mongoose.model("user", UserSchema);
module.exports = User 

