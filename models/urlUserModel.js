const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const uniqueValidator = require('mongoose-unique-validator');

const urlUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter username'],
    trim: true,
    maxlength: [100, 'A user name must have less or equal 100 chars'],
    minlength: [1, 'A user name must be not less that 1 char']
  },
  email: {
    type: String,
    required: [true, 'Please enter email'],
    lowercase: true,
    trim: true,
    unique: true,
    validate: [validator.isEmail, 'Please provide correct email']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please enter password'],
    minlength: [8, 'Password shoud be at least 8 chars long'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm password'],
    validate: {
      validator: function (el) {
        return el === this.password
      },
      message: 'Provided passwords should be the same'
    }
  },
  tosAgreement: {
    type: String,
    required: [true, 'Please read and confirm Terms Of Use to continue'],
    validate: {
      validator: function (el) {
        return el === 'true'
      },
      message: 'Please read and confirm Terms Of Use to continue'
    }
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  passwordChangedAt: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
},
{
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}
)


urlUserSchema.virtual('urls', {
  ref: 'Url',
  foreignField: 'creator',
  localField: '_id'
})

urlUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next()
  }

  this.password = await bcrypt.hash(this.password, 12)

  this.passwordConfirm = undefined
  next()
})

urlUserSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next()
  }

  this.passwordChangedAt = Date.now() - 1000
  next()
})

urlUserSchema.pre(/^find/, function (next) {
  this.find({ active: {
    $ne: false
  }
  })
  next()
})

urlUserSchema.methods.correctPassword = async function (candidatePwd, userPwd) {
  // eslint-disable-next-line no-return-await
  return await bcrypt.compare(candidatePwd, userPwd)
}

urlUserSchema.methods.changedPwdAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)

    return JWTTimestamp < changedTimestamp
  }

  return false
}

urlUserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000

  return resetToken
}

urlUserSchema.plugin(uniqueValidator, { message: 'Given {PATH} already in use' });


const UrlUser = mongoose.model('UrlUser', urlUserSchema)

module.exports = UrlUser
