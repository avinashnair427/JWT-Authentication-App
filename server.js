const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config({ path: './.env'})
const userRouter = require('./routes/userRoutes')
const {globalErrorHandler} = require('./controllers/errorController')

const port = process.env.port

const app = express()

app.use(express.json())

app.use('/authentication', userRouter)

app.all('*', (req,res,next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 400))
})

app.use(globalErrorHandler)

mongoose.connect(process.env.DATABASE_CONNECTION_STRING).then(
    app.listen(port, () => {
        console.log(`Server listening on port ${port}...`)
    })
).catch(err => {
    console.log(err)
})














