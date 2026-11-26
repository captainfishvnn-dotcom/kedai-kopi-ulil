const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Midtrans Snap API (Gunakan isProduction: true jika sudah live)
let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: 'GANTI_DENGAN_SERVER_KEY_MIDTRANS_ANDA',
    clientKey: 'GANTI_DENGAN_CLIENT_KEY_MIDTRANS_ANDA'
});

app.post('/api/create-transaction', async (req, res) => {
    try {
        const { order_id, gross_amount, customer_name, customer_phone, items } = req.body;

        let parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: gross_amount
            },
            item_details: items,
            customer_details: {
                first_name: customer_name,
                phone: customer_phone
            }
        };

        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token, redirect_url: transaction.redirect_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server backend berjalan di http://localhost:${PORT}`);
});
