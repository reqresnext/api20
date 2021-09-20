const UrlUser = require('./../models/urlUserModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')

const filterObj = (obj, ...allowedFields) => {
  const newObj = {}

  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el]
    }
  })
  return newObj
}

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await UrlUser.find()

  res
    .status(200)
    .json({
      status: 'success',
      data: {
        users
      }
    })
})

exports.createUser = (req, res) => {
  res
    .status(524)
    .json({
      status: 'error',
      message: 'This route is not yet defined'
    })
}

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await UrlUser.findById(req.params.id).populate('urls')

  if (!user) {
    return next(new AppError('Can not find user with the given id', 404))
  }

  res
    .status(200)
    .json({
      status: 'success',
      user
    })
})

exports.updateMe = catchAsync(async (req, res, next) => {
  // create error if user POSTs pwd data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for pwd updates. Please use updeteMyPassword route', 400))
  }

  // filer crytical fields

  const filteredBody = filterObj(req.body, 'name', 'email')

  // update user document

  const updatedUser = await UrlUser.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  })

  res
    .status(200)
    .json({
      status: 'success',
      user: updatedUser
    })
})

exports.deleteMe = catchAsync(async (req, res, next) => {
  await UrlUser.findByIdAndUpdate(req.user.id, { active: false })

  res
    .status(204)
    .json({
      status: 'success',
      data: null
    })
})

exports.updateUser = (req, res) => {
  res
    .status(500)
    .json({
      status: 'error',
      message: 'This route is not yet defined'
    })
}

exports.deleteUser = (req, res) => {
  res
    .status(500)
    .json({
      status: 'error',
      message: 'This route is not yet defined'
    })
}
