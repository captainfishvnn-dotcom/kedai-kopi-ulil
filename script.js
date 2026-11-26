// Nomor WhatsApp Tujuan
const SHOP_WHATSAPP = "6285770838109";
// URL Backend untuk meminta Snap Token Midtrans
const BACKEND_URL = "http://localhost:3000/api/create-transaction";

let cart = [];

const formatRupiah = (number) => {
  return "IDR " + number.toLocaleString("id-ID");
};

function renderCart() {
  const container = document.getElementById("cart-items-container");
  const checkoutSection = document.getElementById("cart-checkout-section");
  const badge = document.getElementById("cart-badge");
  const totalPriceEl = document.getElementById("cart-total-price");

  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-cart-msg">Keranjang masih kosong. Yuk pilih kopimu!</p>';
    checkoutSection.style.display = "none";
    badge.textContent = "0";
    return;
  }

  let totalQty = 0;
  let totalPrice = 0;

  cart.forEach((item, index) => {
    totalQty += item.qty;
    totalPrice += item.price * item.qty;

    const itemEl = document.createElement("div");
    itemEl.className = "cart-item";
    itemEl.innerHTML = `
      <img src="${item.img}" alt="${item.name}" />
      <div class="item-detail">
        <h3>${item.name}</h3>
        <div class="item-price">${formatRupiah(item.price)}</div>
        <div class="qty-controls">
          <button type="button" class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button type="button" class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
        </div>
      </div>
      <i data-feather="trash-2" class="remove-item" onclick="removeItem(${index})"></i>
    `;
    container.appendChild(itemEl);
  });

  badge.textContent = totalQty;
  totalPriceEl.textContent = formatRupiah(totalPrice);
  checkoutSection.style.display = "block";
  feather.replace();
}

function addToCart(name, price, img) {
  const existingIndex = cart.findIndex((item) => item.name === name);
  if (existingIndex > -1) {
    cart[existingIndex].qty += 1;
  } else {
    cart.push({ name, price: parseInt(price), img, qty: 1 });
  }
  renderCart();
}

window.changeQty = (index, delta) => {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  renderCart();
};

window.removeItem = (index) => {
  cart.splice(index, 1);
  renderCart();
};

// Event tombol tambah ke keranjang dari menu
document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    addToCart(btn.dataset.name, btn.dataset.price, btn.dataset.img);
  });
});

// Proses Pembayaran Midtrans
const payButton = document.getElementById("pay-button");
const receiptModal = document.getElementById("receipt-modal");
let latestReceiptData = null;

payButton.addEventListener("click", async () => {
  const customerName = document.getElementById("customer-name").value.trim();
  const customerPhone = document.getElementById("customer-phone").value.trim();
  const customerNote = document.getElementById("customer-note").value.trim() || "-";

  if (!customerName || !customerPhone) {
    alert("Harap isi Nama Lengkap dan Nomor WhatsApp Anda terlebih dahulu!");
    return;
  }

  if (cart.length === 0) {
    alert("Keranjang belanja Anda masih kosong.");
    return;
  }

  const orderId = "KOPI-" + Date.now();
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemsSnapshot = [...cart];

  payButton.disabled = true;
  payButton.textContent = "Memproses...";

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        gross_amount: totalAmount,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: itemsSnapshot.map((item) => ({
          id: item.name.toLowerCase().replace(/\s+/g, "-"),
          price: item.price,
          quantity: item.qty,
          name: item.name,
        })),
      }),
    });

    const data = await response.json();

    if (!data.token) {
      throw new Error(data.error || "Gagal mendapatkan token transaksi dari server");
    }

    // Munculkan Popup Midtrans Snap
    window.snap.pay(data.token, {
      onSuccess: function (result) {
        handlePaymentSuccess(result, orderId, customerName, customerPhone, customerNote, itemsSnapshot, totalAmount, "LUNAS (SUCCESS)");
      },
      onPending: function (result) {
        handlePaymentSuccess(result, orderId, customerName, customerPhone, customerNote, itemsSnapshot, totalAmount, "MENUNGGU PEMBAYARAN (PENDING)");
      },
      onError: function (result) {
        alert("Pembayaran gagal! Silakan coba lagi.");
      },
      onClose: function () {
        alert("Anda menutup jendela pembayaran sebelum menyelesaikan transaksi.");
      },
    });
  } catch (error) {
    console.error(error);
    alert("Terjadi kesalahan koneksi ke server pembayaran: " + error.message);
  } finally {
    payButton.disabled = false;
    payButton.textContent = "Bayar Sekarang (Midtrans)";
  }
});

function handlePaymentSuccess(midtransResult, orderId, name, phone, note, items, total, statusText) {
  const transactionTime = midtransResult.transaction_time || new Date().toLocaleString("id-ID");
  const paymentType = (midtransResult.payment_type || "Midtrans").toUpperCase().replace("_", " ");
  const transactionId = midtransResult.transaction_id || orderId;

  latestReceiptData = { orderId, transactionId, transactionTime, paymentType, statusText, name, phone, note, items, total };

  // Tampilkan Struk di Modal
  const badgeEl = document.getElementById("receipt-status-badge");
  badgeEl.textContent = statusText;
  badgeEl.className = statusText.includes("PENDING") ? "receipt-badge pending" : "receipt-badge";

  const itemsHtml = items.map(i => `
    <div class="receipt-item-line">
      <span>${i.name} (${i.qty}x)</span>
      <span>${formatRupiah(i.price * i.qty)}</span>
    </div>`).join("");

  document.getElementById("receipt-details").innerHTML = `
    <div class="receipt-row"><span>No. Order:</span><strong>${orderId}</strong></div>
    <div class="receipt-row"><span>ID Transaksi:</span><span>${transactionId}</span></div>
    <div class="receipt-row"><span>Waktu:</span><span>${transactionTime}</span></div>
    <div class="receipt-row"><span>Metode Bayar:</span><span>${paymentType}</span></div>
    <div class="receipt-divider"></div>
    <div class="receipt-row"><span>Pelanggan:</span><strong>${name}</strong></div>
    <div class="receipt-row"><span>No. HP:</span><span>${phone}</span></div>
    <div class="receipt-row"><span>Catatan:</span><span>${note}</span></div>
    <div class="receipt-divider"></div>
    <div class="receipt-items">${itemsHtml}</div>
    <div class="receipt-divider"></div>
    <div class="receipt-total"><span>TOTAL BAYAR</span><span>${formatRupiah(total)}</span></div>
  `;

  cart = [];
  renderCart();
  receiptModal.style.display = "flex";

  // Otomatis arahkan ke WhatsApp setelah 1.5 detik
  setTimeout(() => {
    sendToWhatsApp();
  }, 1500);
}

function sendToWhatsApp() {
  if (!latestReceiptData) return;
  const d = latestReceiptData;
  const itemListText = d.items.map(item => `- ${item.name} (${item.qty}x) = ${formatRupiah(item.price * item.qty)}`).join("\n");

  const message = 
    `*BUKTI PEMBAYARAN - TAMAN KOPI KELINGAN MANTAN*\n` +
    `------------------------------------\n` +
    `Status: *${d.statusText}*\n` +
    `No. Order: *${d.orderId}*\n` +
    `Metode: ${d.paymentType}\n` +
    `Waktu: ${d.transactionTime}\n\n` +
    `*Data Pelanggan:*\n` +
    `Nama: *${d.name}*\n` +
    `No. WA: ${d.phone}\n` +
    `Catatan: ${d.note}\n\n` +
    `*Detail Pesanan:*\n` +
    `${itemListText}\n` +
    `------------------------------------\n` +
    `*Total Bayar: ${formatRupiah(d.total)}*\n\n` +
    `Halo, berikut bukti pesanan/pembayaran saya. Mohon diproses ya kak!`;

  const waUrl = `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank");
}

document.getElementById("send-wa-btn").addEventListener("click", sendToWhatsApp);
document.getElementById("close-receipt").onclick = (e) => {
  receiptModal.style.display = "none";
  e.preventDefault();
};

renderCart();
