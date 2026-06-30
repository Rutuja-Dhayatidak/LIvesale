// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the full error to console
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Handle invalid Mongoose ObjectId CastError (status 400)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  }

  // Handle Mongoose Validation Errors (status 422)
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  res.status(statusCode).json({
    success: false,
    error: message
  });
};

module.exports = errorHandler;
