import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: Record<string, any>) => {
      delete ret.__v;
      delete ret.passwordHash;
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  },
})
export class User extends Document {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 3,
  })
  name!: string;

  @Prop({
    required: true,
    select: false,
  })
  passwordHash!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

