import { param } from 'express-validator';
import mongoose from 'mongoose';

function mongoIdParam(name = 'id') {
  return param(name)
    .custom((value) => mongoose.Types.ObjectId.isValid(String(value)))
    .withMessage(`${name} must be a valid MongoDB ObjectId`);
}

export { mongoIdParam };