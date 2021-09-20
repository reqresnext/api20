const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const APIFeatures = require('./../utils/apiFeatures')

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id)

    if (!doc) {
      return next(new AppError('No document found with that ID', 404))
    }

    res.status(204).json({
      status: 'success',
      data: null
    })
  })

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const updatedDocument = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })

    if (!updatedDocument) {
      return next(new AppError('No ducument with the given ID', 404))
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: updatedDocument
      }
    })
  })

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const document = await Model.create(req.body)

    res.status(201).json({
      status: 'success',
      data: {
        data: document
      }
    })
  })

exports.getOne = (Model, populateOptions) => catchAsync(async (req, res, next) => {
  let query = Model.findById(req.params.id)

  if (populateOptions) {
    query = query.populate(populateOptions)
  }

  const document = await query

  if (!document) {
    return next(new AppError('No document with given ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: document
    }
  })
})

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    // To allow for nested get reviews on tour
    let filter = {}

    if (req.body.userId) {
      filter = {
        creator: req.body.userId
      }
    }

    let features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate()

    let document = await features.query

    res.status(201).json({
      status: 'success',
      sss: document.length,
      data: {
        data: document
      }
    })
  })
