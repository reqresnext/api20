const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const useragent = require('express-useragent')

const path = require('path')

const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorController')
const urlRouter = require('./routes/urlRoutes')

const urlUserRouter = require('./routes/urlUserRoutes')

const app = express()

app.use(cors())

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

app.use(useragent.express());

app.use(express.static(path.join(__dirname, 'public')))

app.use(helmet())

app.use(morgan('dev'))

const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP'
})

app.use('/api', limiter)

app.use(express.json({ limit: '10kb' }))

// Data sanitazation against NoSQL query injections
app.use(mongoSanitize())

// Data sanitazation agains XSS
app.use(xss())

app.use(hpp({
  whitelist: [
    'duration',
    'price'
  ]
}))

app.get('/', (req, res) => {
  res
    .status(200)
    .render('base', {
      tour: 'John-The-Reaper',
      user: 'Jonas'
    })
})

app.use('/api/v1/urls', urlRouter)
app.use('/api/v1/urlUsers', urlUserRouter)

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404))
})

app.use(globalErrorHandler)

module.exports = app
