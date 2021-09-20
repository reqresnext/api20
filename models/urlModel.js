const mongoose = require('mongoose')
const validator = require('validator')

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const urlSchema = new mongoose.Schema({
  longUrl: {
    type: String,
    required: [true, 'You should enter URL which you want to shrink'],
    validate: {
      validator: value => validator.isURL(value, { protocols: ['http', 'https', 'ftp'], require_tld: true, require_protocol: false }),
      message: 'Must be a Valid URL'
    },
    minlength: [3, 'URL shoud be at least 3 chars long'],
    maxlength: [1000, 'URL shoud not be more than 1000 chars long']
  },
  urlAlias: {
    type: String,
    trim: true,
    validate: {
      validator: value => validator.isAlphanumeric(value,'en-US'),
      message: 'Custom URL should contains only numbers and letters of English alphabet'
    },
    index: {
      unique: true,
      partialFilterExpression: {
        urlAlias: {
          $type: 'string'
        }
      }
    },
  },

  creatorIP: {
    type: String,
    maxlength: [100, 'Smth wrong with client IP address'],
    trim: true
  },
  randomURL: {
    type: Boolean
  },
  createdAt: {
    type: Date,
    default: dayjs.utc(),
    select: false
  },
  clicks: {
    type: [Object],
    timestamps: true
  },
  creator: {
    type: mongoose.Schema.ObjectId,
    ref: 'UrlUser'
  }
},
{
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

urlSchema.pre(/^find/, function (next) {
  this
    .populate({
      path: 'creator',
      select: 'name email'
    })
  next()
})

const Url = mongoose.model('Url', urlSchema)

module.exports = Url
