import express from 'express';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import cloudinary from 'cloudinary';
import * as dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.log('MongoDB connection error:', err));

// Cloudinary configuration
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// MongoDB schema and model
const ImageSchema = new mongoose.Schema({
    url: String,
});
const Image = mongoose.model('Image', ImageSchema);

// Endpoint to create an order
app.post('/api/orders', async (req, res) => {
    const { amount } = req.body;
    const receiptId = `receipt_order_${Date.now()}`;
    const options = {
        amount: amount * 100, // amount in the smallest currency unit (e.g., paise)
        currency: 'INR',
        receipt: receiptId,  
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.log('Error creating order:', error);
        res.status(500).send('Error creating order');
    }
});

// Endpoint to handle payment capture and image upload
app.post('/api/capture/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    const { amount, image } = req.body;
  
    try {
      console.log('Received image data:', image ? `${image.slice(0, 100)}...` : 'No image data');
  
      let payment;
      try {
        // Attempt to capture the payment
        payment = await razorpay.payments.capture(paymentId, amount * 100, 'INR');
      } catch (captureError) {
        // If the payment has already been captured, fetch the payment details
        if (captureError.error && captureError.error.description === 'This payment has already been captured') {
          payment = await razorpay.payments.fetch(paymentId);
        } else {
          throw captureError;
        }
      }
  
      if (payment.status !== 'captured') {
        return res.status(500).json({ error: 'Payment not captured' });
      }
  
      console.log('Payment captured successfully:', payment);
  
      if (!image) {
        return res.status(400).json({ error: 'No image data received' });
      }
  
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  
      // Upload image to Cloudinary
      const uploadResponse = await cloudinary.v2.uploader.upload(`data:image/png;base64,${base64Data}`, {
        folder: 'custom_shirts',
      });
      console.log('Image uploaded to Cloudinary:', uploadResponse.secure_url);
  
      // Save the image URL to MongoDB
      const newImage = new Image({ url: uploadResponse.secure_url });
      const savedImage = await newImage.save();
      console.log('Image URL saved to MongoDB:', savedImage);
  
      res.json({ message: 'Payment successful and image uploaded', imageUrl: uploadResponse.secure_url });
  
    } catch (error) {
      console.error('Error in payment capture process:', error);
      res.status(500).json({ error: error.message || 'Error in payment capture process' });
    }
  });
app.get('/api/razorpay-key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
  });

// Start the server
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(8080, () => console.log('Server running on port 8080'));
