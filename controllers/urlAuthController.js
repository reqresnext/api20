const crypto = require('crypto')
const UrlUser = require('./../models/urlUserModel')
const catchAsync = require('./../utils/catchAsync')
const jwt = require('jsonwebtoken')
const AppError = require('./../utils/appError')
const { promisify } = require('util')
const sendEmail = require('./../utils/email')

const signToken = id => {
  return jwt.sign({
    id
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true
  }

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true
  }

  res
    .cookie('jwt', token, cookieOptions)

  user.password = undefined

  res
    .status(statusCode)
    .json({
      status: 'success',
      token,
      data: {
        user
      }
    })
}

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await UrlUser.create(req.body)

  if(!newUser) {
    return next(new AppError('Smth went wrong, please try again later or contuct the administrator', 400))
  }

  createSendToken(newUser, 201, res)
})

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body // field is the same is the property of body
  // Check if email and password correct and body conrains them

  if (!email || !password) {
    next(new AppError('Please provide correct email and password pair', 400))
  }
  // Check if the user exists and pwd is correct

  const user = await UrlUser.findOne({ email: email }).select('+password')
  // If so, send token to client

  if (!user || !await user.correctPassword(password, user.password)) {
    return next(new AppError('Incorrect email or password', 401))
  }

  const token = signToken(user._id)

  res
    .status(200)
    .json({
      status: 'success',
      token
    })
})

/**
 * Here we will find relation between shorten URL and users who create them. 
 * If user is not logged in - we will live creator field as empty
 */
exports.populateUser = catchAsync(async (req, res, next) => {

  // Get token and check if it exists

  let token = ''

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && req.headers.authorization.length > 20) {
    token = req.headers.authorization.split(' ')[1]
    const decodedToken = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

    // Check is user still exists
    const currentUser = await UrlUser.findById(decodedToken.id)

    if (!currentUser) {
      return next(new AppError('User with the given token is not longer exist'), 401)
    }
    // Check if user changed password after the token was requsted

    if (currentUser.changedPwdAfter(decodedToken.iat)) {
      return next(new AppError('User recently changed password. Please login again'), 401)
    }

    req.user = currentUser.id
    req.body.creator = currentUser.id
    next()
  } else {
    next()
  }
  
})


exports.protectLogin = catchAsync(async (req, res, next) => {
  let token = '';

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  // Validate token
  if (!token) {
    res
    .status(400)
    .json({
      status: 'error',
      token
    })
  }

  const decodedToken = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

  // Check is user still exists
  const currentUser = await UrlUser.findById(decodedToken.id)

  if (!currentUser) {
    return next(new AppError('User with the given token is not longer exist'), 401)
  }
  // Check if user changed password after the token was requsted

  if (currentUser.changedPwdAfter(decodedToken.iat)) {
    return next(new AppError('User recently changed password. Please login again'), 401)
  }

  res
    .status(200)
    .json({
      status: 'success',
      token
    })
})


exports.protect = catchAsync(async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in and try again.'), 401)
  }
  // Validate token

  const decodedToken = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

  // Check is user still exists
  const currentUser = await UrlUser.findById(decodedToken.id)

  if (!currentUser) {
    return next(new AppError('User with the given token is not longer exist'), 401)
  }
  // Check if user changed password after the token was requsted

  if (currentUser.changedPwdAfter(decodedToken.iat)) {
    return next(new AppError('User recently changed password. Please login again'), 401)
  }

  req.body.userId = decodedToken.id

  next()
})

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      )
    }

    next()
  }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // get user based on POSTed email
  const user = await UrlUser.findOne({ email: req.body.email })

  if (!user) {
    return next(new AppError(`There is no user with the given email address`, 404))
  }
  // Generate random token

  const resetToken = user.createPasswordResetToken()

  await user.save({ validateBeforeSave: false })
  // send it to user's email

  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`

  const message = `Forgot password? ${resetURL}`

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token',
      message
    })
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    })
  } catch (err) {
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save({ validateBeforeSave: false })

    return next(new AppError('There was an error sending the email. Please try again later', 500))
  }
})

exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on a token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

  const user = await UrlUser.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  })
  // if token is valid, set the new password

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400))
  }

  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()
  // update changedPasswordAt property of user

  // Log the user in - send JWT
  const token = signToken(user._id)

  res
    .status(200)
    .json({
      status: 'success',
      token
    })
})

exports.updatePassword = catchAsync(async (req, res, next) => {
  // get user from collection
  const user = await UrlUser.findById(req.user.id).select('+password')

  // check if the posted pwd is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Please enter correct password', 404))
  }
  // if so, update the pwd

  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  await user.save()

  // log user in, send JWT
  const token = signToken(user._id)

  res
    .status(200)
    .json({
      status: 'success2',
      token
    })
})
