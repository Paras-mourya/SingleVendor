import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Please provide a question'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Please provide an answer'],
    },
  },
  {
    timestamps: true,
  }
);

const FAQ = mongoose.model('FAQ', faqSchema);

// Performance indexes for FAQ queries
faqSchema.index({ question: 1 });
faqSchema.index({ answer: 1 });
faqSchema.index({ createdAt: -1 });

export default FAQ;
