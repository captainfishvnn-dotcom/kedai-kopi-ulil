// Nomor WhatsApp Tujuan (Format Internasional tanpa +)
const SHOP_WHATSAPP = "6285770838109";
// URL Backend untuk meminta Snap Token Midtrans
const BACKEND_URL = "http://localhost:3000/api/create-transaction";

// Toggle class active untuk hamburger menu
const navbarNav = document.querySelector(".navbar-nav");
document.querySelector("#hamburger-menu").onclick = () => {
  navbarNav.classList.toggle("active");
};

// Toggle class active untuk search form
const searchForm = document.querySelector(".search-form");
const searchBox = document.querySelector("#search-box");

document.querySelector("#search-button").onclick = (e) => {
  searchForm.classList.toggle("active");
  searchBox.focus();
  e.preventDefault();
};

// Toggle class active untuk shopping cart
const shoppingCart = document.querySelector(".shopping-cart");
document.querySelector("#shopping-cart-button").onclick = (e) => {
  shoppingCart.classList.toggle("active");
  e.preventDefault();
};

// Klik di luar elemen
const hm = document.querySelector("#hamburger-menu");
const sb = document.querySelector("#search-button");
const sc = document.querySelector("#shopping-cart-button");

document.addEventListener("click", function (e) {
  if (!hm.contains(e.target) && !navbarNav.contains(e.target)) {
    navbarNav.classList.remove("active");
  }
  if (!sb.contains(e.target) && !searchForm.contains(e.target)) {
    searchForm.classList.remove("active");
  }
  if (
    !sc.contains(e.target) &&
    !shoppingCart.contains(e.target) &&
    !e.target.classList.contains("qty-btn") &&
    !e.target.classList.contains("remove-item")
  ) {
    shoppingCart.classList.remove("active");
  }
});

// ========================
// SISTEM KERANJANG BELANJA
// ========================
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
    container.innerHTML =
      '<p class="empty-cart-msg">Keranjang masih kosong. Yuk pilih kopimu!</p>';
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
          <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
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
  shoppingCart.classList.add("active");
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

// Pasang event ke semua tombol "+ Keranjang"
document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const name = btn.dataset.name;
    const price = btn.dataset.price;
    const img = btn.dataset.img;
    addToCart(name, price, img);
  });
});

// ========================
// MODAL DETAIL PRODUK
// ========================
const itemDetailModal = document.querySelector("#item-detail-modal");
const itemDetailButtons = document.querySelectorAll(".item-detail-button");

itemDetailButtons.forEach((btn) => {
  btn.onclick = (e) => {
    e.preventDefault();
    document.getElementById("modal-title").textContent = btn.dataset.name;
    document.getElementById("modal-img").src = btn.dataset.img;
    document.getElementById("modal-price").innerHTML =
      `${formatRupiah(parseInt(btn.dataset.price))} <span>${btn.dataset.oldprice}</span>`;

    const modalAddBtn = document.getElementById("modal-add-cart");
    modalAddBtn.onclick = (ev) => {
      ev.preventDefault();
      addToCart(btn.dataset.name, btn.dataset.price, btn.dataset.img);
      itemDetailModal.style.display = "none";
    };

    itemDetailModal.style.display = "flex";
  };
});

document.querySelector("#item-detail-modal .close-icon").onclick = (e) => {
  itemDetailModal.style.display = "none";
  e.preventDefault();
};

// ========================
// PEMBAYARAN MIDTRANS & BUKTI BAYAR + WHATSAPP
// ========================
const payButton = document.getElementById("pay-button");
const receiptModal = document.getElementById("receipt-modal");
let latestReceiptData = null;

payButton.addEventListener("click", async () => {
  const customerName = document.getElementById("customer-name").value.trim();
  const customerPhone = document.getElementById("customer-phone").value.trim();
  const customerNote =
    document.getElementById("customer-note").value.trim() || "-";

  if (!customerName || !customerPhone) {
    alert("Harap isi Nama Lengkap dan Nomor WhatsApp Anda terlebih dahulu!");
    return;
  }

  if (cart.length === 0) {
    alert("Keranjang belanja Anda masih kosong.");
    return;
  }

  const orderId = "KOPI-" + Date.now();
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );
  const itemsSnapshot = [...cart];

  payButton.disabled = true;
  payButton.textContent = "Memproses...";

  try {
    // Minta Snap Token ke Server Backend
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
      throw new Error(
        data.error || "Gagal mendapatkan token transaksi dari server",
      );
    }

    // Tampilkan Popup Pembayaran Midtrans
    window.snap.pay(data.token, {
      onSuccess: function (result) {
        handlePaymentSuccess(
          result,
          orderId,
          customerName,
          customerPhone,
          customerNote,
          itemsSnapshot,
          totalAmount,
          "LUNAS (SUCCESS)",
        );
      },
      onPending: function (result) {
        handlePaymentSuccess(
          result,
          orderId,
          customerName,
          customerPhone,
          customerNote,
          itemsSnapshot,
          totalAmount,
          "MENUNGGU PEMBAYARAN (PENDING)",
        );
      },
      onError: function (result) {
        alert("Pembayaran gagal! Silakan coba lagi.");
        console.error(result);
      },
      onClose: function () {
        alert(
          "Anda menutup jendela pembayaran sebelum menyelesaikan transaksi.",
        );
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

function handlePaymentSuccess(
  midtransResult,
  orderId,
  name,
  phone,
  note,
  items,
  total,
  statusText,
) {
  const transactionTime =
    midtransResult.transaction_time || new Date().toLocaleString("id-ID");
  const paymentType = (midtransResult.payment_type || "Midtrans")
    .toUpperCase()
    .replace("_", " ");
  const transactionId = midtransResult.transaction_id || orderId;

  latestReceiptData = {
    orderId,
    transactionId,
    transactionTime,
    paymentType,
    statusText,
    name,
    phone,
    note,
    items,
    total,
  };

  // Render Struk Bukti Pembayaran
  const badgeEl = document.getElementById("receipt-status-badge");
  badgeEl.textContent = statusText;
  badgeEl.className = statusText.includes("PENDING")
    ? "receipt-badge pending"
    : "receipt-badge";

  const itemsHtml = items
    .map(
      (i) => `
      <div class="receipt-item-line">
        <span>${i.name} (${i.qty}x)</span>
        <span>${formatRupiah(i.price * i.qty)}</span>
      </div>`,
    )
    .join("");

  document.getElementById("receipt-details").innerHTML = `
    <div class="receipt-row"><span>No. Order:</span><strong>${orderId}</strong></div>
    <div class="receipt-row"><span>ID Transaksi:</span><span>${transactionId}</span></div>
    <div class="receipt-row"><span>Waktu:</span><span>${transactionTime}</span></div>
    <div class="receipt-row"><span>Metode Bayar:</span><span>${paymentType}</span></div>
    <div class="receipt-divider"></div>
    <div class="receipt-row"><span>Nama Pelanggan:</span><strong>${name}</strong></div>
    <div class="receipt-row"><span>No. HP Pelanggan:</span><span>${phone}</span></div>
    <div class="receipt-row"><span>Catatan:</span><span>${note}</span></div>
    <div class="receipt-divider"></div>
    <div class="receipt-items">${itemsHtml}</div>
    <div class="receipt-divider"></div>
    <div class="receipt-total"><span>TOTAL BAYAR</span><span>${formatRupiah(total)}</span></div>
  `;

  // Kosongkan keranjang & tampilkan modal bukti pembayaran
  cart = [];
  renderCart();
  shoppingCart.classList.remove("active");
  receiptModal.style.display = "flex";

  // Otomatis arahkan ke WhatsApp Toko setelah 1.5 detik
  setTimeout(() => {
    sendToWhatsApp();
  }, 1500);
}

function sendToWhatsApp() {
  if (!latestReceiptData) return;

  const d = latestReceiptData;
  const itemListText = d.items
    .map(
      (item) =>
        `- ${item.name} (${item.qty}x) = ${formatRupiah(item.price * item.qty)}`,
    )
    .join("\n");

  const message =
    `*BUKTI PEMBAYARAN - TAMAN KOPI KELINGAN MANTAN*\n` +
    `------------------------------------\n` +
    `Status: *${d.statusText}*\n` +
    `No. Order: *${d.orderId}*\n` +
    `ID Midtrans: ${d.transactionId}\n` +
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
    `Terima kasih telah memesan!`;

  const waUrl = `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank");
}

document
  .getElementById("send-wa-btn")
  .addEventListener("click", sendToWhatsApp);

document.getElementById("close-receipt").onclick = (e) => {
  receiptModal.style.display = "none";
  e.preventDefault();
};

// Inisialisasi awal keranjang
renderCart();
