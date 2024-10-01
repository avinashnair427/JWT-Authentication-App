const express = require('express')

const authController = require('./../controllers/authController')

const userRouter = express.Router()

userRouter.post('/signUp', authController.signUp)
userRouter.post('/login', authController.login)
userRouter.get('/getUserData', authController.protect, authController.getUserData)
userRouter.patch('/changePassword', authController.protect, authController.changePassword)

userRouter.post('/forgotPassword', authController.forgotPassword)
userRouter.patch('/resetPassword/:resetToken', authController.resetPassword)

module.exports = userRouter