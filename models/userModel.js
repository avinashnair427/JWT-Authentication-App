const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name'],
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        required: [true, 'Please enter a valid email'],
        trim: true, 
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please enter your password'],
        minlength: 8,
        trim: true,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        select: false,
        validate: {
            validator: function(){
                return this.password === this.passwordConfirm
            },
            message: 'Passwords do not match'
        }
    },
    passwordChangedAt: String,
    passwordResetToken: String,
    passwordResetTokenExpires: Date
})

userSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 12)
    this.passwordConfirm = undefined
    next()
})

userSchema.pre('save', function(next){
    if(!this.isModified('password') || this.isNew) return next()
    this.passwordChangedAt = Date.now() - 1000
    next()
})

userSchema.methods.generatePasswordResetToken = function(){
    
    let resetToken = crypto.randomBytes(32).toString('hex')
    
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    
    this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000

    return resetToken
}

userSchema.methods.isCorrectPassword = async (candidatePassword, actualPassword) => await bcrypt.compare(candidatePassword, actualPassword)

userSchema.methods.passwordChanged = (user, decodedTime) => {
    if(user.passwordChanged){
        return user.passwordChangedAt > decodedTime * 1000
    }
    return false
}

const User = mongoose.model('User', userSchema)

module.exports = User