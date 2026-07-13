import { param } from 'express-validator';
import mongoose from 'mongoose';

function objectIdParam(name: string) {
  return param(name)
    .custom((value) => mongoose.Types.ObjectId.isValid(String(value)))
    .withMessage(`${name} must be a valid MongoDB ObjectId`);
}

const conversationIdRules = [objectIdParam('conversationId')];
const roomIdRules = [objectIdParam('roomId')];

export { conversationIdRules, roomIdRules };
