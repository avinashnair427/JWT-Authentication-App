class AppError extends Error {
    constructor(message, statusCode){
        super(message)
        this.statusCode = statusCode || 500
        this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error'
        this.isOperationalError = true
    }
}

module.exports = AppError