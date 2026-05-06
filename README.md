# ViralWindow - Hệ thống quản lý sản xuất và kinh doanh cho doanh nghiệp nhỏ

![ViralWindow](https://via.placeholder.com/800x400?text=ViralWindow+ERP)

## 📖 Giới thiệu
**ViralWindow** là một hệ thống quản trị doanh nghiệp (ERP) được thiết kế chuyên biệt cho các doanh nghiệp sản xuất và thi công nhôm kính nhỏ và vừa. Hệ thống giúp số hóa quy trình vận hành, tự động hóa bóc tách dự toán vật tư và quản lý tiến độ hiệu quả.

## 🚀 Tính năng nổi bật
*   **CRM & Bán hàng:** Quản lý thông tin khách hàng, báo giá, chốt đơn vị thi công.
*   **Tự động bóc tách dự toán:** Thuật toán tự động bóc tách khối lượng vật tư (nhôm, kính, phụ kiện) dựa trên kích thước thiết kế.
*   **Quản lý Kho (Inventory):** Quản lý xuất/nhập/tồn kho nguyên vật liệu chính xác.
*   **Quản lý Tiến độ (Production):** Theo dõi tiến độ gia công, lắp đặt tại xưởng và công trình.
*   **Quản lý Thu Chi:** Theo dõi công nợ, dòng tiền.

## 🛠 Cài đặt và Chạy ứng dụng (Local Setup)

### Yêu cầu hệ thống:
*   [Node.js](https://nodejs.org/) (Khuyến nghị bản LTS)
*   [XAMPP](https://www.apachefriends.org/) hoặc [MySQL Server](https://dev.mysql.com/downloads/mysql/)

### Cài đặt Database
1. Mở XAMPP, bật **MySQL** và **Apache**.
2. Truy cập `http://localhost/phpmyadmin/`.
3. Tạo một database mới tên là `viral_window_db`.
4. Import file `database/viralwindow_schema.sql` vào database vừa tạo.

### Cài đặt Backend
1. Mở Terminal / Command Prompt và di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Tạo file `.env` bằng cách copy từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Cấu hình thông tin kết nối Database trong file `.env` (Mặc định XAMPP thường là user `root` và password rỗng).
5. Khởi động server backend:
   ```bash
   npm start
   ```

### Cài đặt Frontend
Dự án sử dụng Frontend tĩnh (HTML/CSS/JS), bạn có thể chạy bằng một trong hai cách:
1. Mở thư mục `frontend` bằng VS Code và sử dụng extension **Live Server** (Khuyến nghị).
2. Hoặc upload nội dung thư mục `frontend` lên máy chủ web tĩnh (Apache/Nginx/Vercel/Netlify).

## 🧑‍💻 Tác giả
* **Lê Văn Hải** - [Github Profile](https://github.com/LeVanHai25)
