const dotenv = require('dotenv')
const mongoose = require('mongoose')
const app = require('./app')

dotenv.config({ path: './config.env' })

mongoose.connect(process.env.DB_PLAIN, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true
}).then(() => {
  console.log('DB connection: success')
}).catch(err => console.log(err));


const port = process.env.PORT || 4000

app.listen(port, () => {
  console.log(`App is on port ${port}`)
  console.log(process.env.NODE_ENV)
})

