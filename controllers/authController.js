const { promisify } = require('util')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const catchAsync = require('./../utils/catchAsync')
const User = require('./../models/userModel')
const AppError = require('./../utils/appError')
const sendEMail = require('./../utils/email')

const createToken = userId => {
    const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET_KEY, { expiresIn: process.env.JWT_TOKEN_EXPIRES_IN })
    return token
}

exports.signUp = catchAsync(async (req,res,next) => {

    const user = await User.findOne({ email: req.body.email })

    if(user) throw new AppError('User with this email already exists.', 409)

    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    })

    const token = createToken(newUser._id)

    res.status(201).json({
        status: 'success',
        token
    })
})

exports.login = catchAsync(async (req,res,next) => {

    const { email, password } = req.body

    if(!email || !password) throw new AppError('Please enter both fields.', 400)

    const user = await User.findOne({ email: email }).select('+password')
    
    if(!user || !(await user.isCorrectPassword(password, user.password))) throw new AppError('Incorrect email or password.', 401)

    const token = createToken(user._id)

    res.status(200).json({
        status: 'success',
        token
    })
})

exports.protect = catchAsync(async (req,res,next) => {
    let token

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1]
    }

    if(!token) throw new AppError('You are not logged in. Please log in to gain access.', 401)

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_KEY)
    const user = await User.findOne({ _id: decoded.userId }).select('+password')

    if(!user) throw new AppError('The user belonging to this email no longer exists.', 401)

    if(user.passwordChanged(user, decoded.iat)) throw new AppError('User recently changed password. Please log in again.', 401)

    req.user = user
    next()
})

exports.getUserData = catchAsync(async (req,res,next) => {
    res.status(200).json({
        status: 'success',
        data: {
            user: req.user,
            data: 'Your data'
        }
    })
})

exports.changePassword = catchAsync(async (req,res,next) => {
    
    const { password, newPassword, newPasswordConfirm } = req.body
    console.log(newPassword, newPasswordConfirm)

    if(!password || !newPassword || !newPasswordConfirm) throw new AppError('Please enter all the required fields', 400)
        
    const user = await User.findOne({ email: req.user.email })
    
    if(!(await user.isCorrectPassword(password, req.user.password))) throw new AppError('Incorrect password. Please try again.', 401)
        
    if(newPassword !== newPasswordConfirm) throw new AppError('Passwords do not match.', 400)

    user.password = newPassword
    user.passwordConfirm = newPasswordConfirm
    await user.save({ runValidators: false })

    res.status(200).json({
        status: 'success',
        message: 'Password updated.'
    })
})

exports.forgotPassword = catchAsync(async (req,res,next) => {
    
    const { email } = req.body

    const user = await User.findOne({ email: email })
    
    if(!user) throw new AppError('User with this email does not exist.', 404)
        
    const resetToken = user.generatePasswordResetToken()
    await user.save({ runValidators: false })
    
    const resetURL = `${req.protocol}://${req.get('host')}/authentication/resetPassword/${resetToken}`
    
    const message = `Forgot your password? Send a PATCH request to ${resetURL} with your password and password confirm. If you did not forget you password, ignore this email`

    try{
        await sendEMail({
            email: email,
            subject: 'Your password reset token. Token expires in 10 mintutes.',
            message
        })
        
        res.status(200).json({
            status: 'success',
            message: 'Your token has been sent to your email'
        })
    }
    catch(err){
        console.log(err)
        user.passwordResetToken = undefined,
        user.passwordResetTokenExpires = undefined
        user.save({ runValidators: false })
        throw new AppError('There was an error sending the email. Try again later.', 500)
    }
})

exports.resetPassword = catchAsync(async (req,res,next) => {

    const { password, passwordConfirm } = req.body

    const { resetToken } = req.params
    const candidateResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    
    const user = await User.findOne({ passwordResetToken: candidateResetToken, passwordResetTokenExpires: { $gt: Date.now() } })

    if(!user) throw new AppError('Token is invalid or has expired', 400)

    if(!password || !passwordConfirm) throw new AppError('Please enter your password.', 400)

    if(password !== passwordConfirm) throw new AppError('Passwords do not match.', 404)

    user.password = password
    user.save({ runValidators: false })

    res.status(200).json({
        status: 'success',
        message: 'Your password has been reset.'
    })
})