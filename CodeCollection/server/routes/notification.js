import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    docentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentNaam: String,
    bedrijf: String,
    bericht: String,
    type: {
      type: String,
      enum: ['stage_aanvaard', 'stage_ingediend', 'logboek_ingediend'],
      default: 'stage_aanvaard',
    },
    isGelezen: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

export default mongoose.model('Notification', notificationSchema)