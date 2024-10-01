const AppError = require("../utils/appError")

exports.globalErrorHandler = (err,req,res,next) => {
    
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'
    
    if(err.name === 'ValidationError') err = handleDBValidationError(err)
    if(err.name === 'TokenExpiredError') err = handleTokenExpirationError(err)
    sendErrorProd(err,res)
}

const handleDBValidationError = (err) => {
    let message = Object.values(err.errors).map(el => el.message).join('. ')
    message = `Invalid input data. ${message}`
    return new AppError(message, 400)
}

const handleTokenExpirationError = (err) => {
    message = `Your token has expired. Please log in to gain access.`
    return new AppError(message, 401)
}

const sendErrorProd = (err, res) => {
    if(err.isOperationalError){
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    }
    else{
        res.status(500).json({
            status: 'fail',
            message: 'Something went very wrong'
        })
    }
}