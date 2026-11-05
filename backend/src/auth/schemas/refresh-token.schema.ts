import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({
  timestamps: true,
})
export class RefreshToken extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  tokenHash!: string;

  @Prop({
    required: true,
    index: true,
  })
  familyId!: string;

  @Prop({
    required: true,
    default: false,
    index: true,
  })
  isRevoked!: boolean;

  @Prop({
    required: true,
    index: { expires: 0 },
  })
  expiresAt!: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
