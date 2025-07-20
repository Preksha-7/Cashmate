# CashMate: Your Personal Finance Assistant

CashMate is a full-stack application designed to help users track, manage, and understand their financial activities. Users can effortlessly log income and expenses, categorize transactions, and gain insights into their spending habits through interactive summaries and charts.

## Features

### Core Requirements

- **Income/Expense Entry**: Log income and expenses through an intuitive web interface
- **Transaction Listing & Filtering**: View all transactions with filters by date, type, and category
- **Financial Visualizations**: Interactive charts showing expense breakdowns and monthly trends
- **Receipt OCR**: Extract transaction data from uploaded images and PDFs using OCR
- **API-Driven Architecture**: Fully decoupled frontend and backend communicating via REST APIs
- **Secure Data Persistence**: All financial and user data is stored securely in a database

### Bonus Features

- **PDF Parsing**: Upload tabular-format PDF files and auto-extract transaction data
- **Pagination**: Paginated transaction lists for enhanced performance
- **Multi-User Support**: Each user has a secure, personal account with isolated data

### Code Quality

- **Clean & Modular Code**: Clear naming conventions and logical separation (controllers, services, models, etc.)
- **Robust Error Handling**: Comprehensive validation and graceful failure mechanisms
- **Well-Documented**: Includes meaningful comments and a detailed README for setup and usage guidance

## Getting Started

To set up and run the CashMate application on your local machine, follow these steps:

### Prerequisites

- Node.js (LTS version recommended, e.g., 18+)
- npm or Yarn
- MySQL Database (e.g., MySQL 8.0)
- Python (3.8+)
- pip (Python package installer)
- Tesseract OCR (for receipt image processing) - ensure `tesseract.exe` is in your system PATH or update the path in `python-microservice/main.py`

## Installation

### 1. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
# or yarn install
```

**Environment Configuration:**

Create a `.env` file in the backend directory (e.g., `Cashmate-ab908958bd843a9b26731e6c02c2babaceea3952/backend/.env`) with your database credentials and JWT secrets:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cashmate
DB_PORT=3306
JWT_SECRET=supersecretjwtkey
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=supersecretjwtrefreshkey
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN_MS=604800000 # 7 days in milliseconds
OCR_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

Replace `your_mysql_password` with your actual MySQL root password.

**Database Setup:**

The `database/dbsetup.sql` file contains the schema for the users, transactions, receipts, categories, and refresh_tokens tables, along with some default categories and views. You need to execute this SQL script in your MySQL client to set up the database.

```sql
-- Connect to MySQL as root: mysql -u root -p
-- Then, execute the script:
SOURCE /path/to/Cashmate-ab908958bd843a9b26731e6c02c2babaceea3952/database/dbsetup.sql;
```

**Run the Backend:**

```bash
npm run dev
# or yarn dev
```

The backend server should start on http://localhost:5000.

### 2. Python Microservice Setup (for OCR and PDF Parsing)

Navigate to the Python microservice directory:

```bash
cd python-microservice
```

Create a virtual environment (recommended):

```bash
python -m venv venv
```

Activate the virtual environment:

- **Windows**: `.\venv\Scripts\activate`
- **macOS/Linux**: `source venv/bin/activate`

Install Python dependencies:

```bash
pip install -r requirements.txt
```

**Tesseract OCR Installation:**

- **Windows**: Download and install Tesseract from [Tesseract-OCR GitHub](https://github.com/tesseract-ocr/tesseract). Make sure to add it to your system PATH during installation.
- **macOS**: `brew install tesseract`
- **Linux**: `sudo apt-get install tesseract-ocr`

> **Important**: Verify the `pytesseract.pytesseract.tesseract_cmd` path in `python-microservice/main.py` matches your Tesseract installation directory. The default path in the code is `C:\Program Files\Tesseract-OCR\tesseract.exe`.

**Run the Python Microservice:**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The OCR/PDF service should start on http://localhost:8000.

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
# or yarn install
```

**Run the Frontend:**

```bash
npm start
# or yarn start
```

The frontend application should open in your browser at http://localhost:3000.

## Usage

1. **Register**: On the login page, click "Don't have an account? Create one" to register a new user
2. **Login**: Use your registered credentials to log in
3. **Dashboard**: View your financial summary, monthly trends, and category breakdown
4. **Transactions**: Add new transactions manually or view/delete existing ones
5. **Upload**:
   - Upload images (JPEG, PNG, WebP, HEIC, HEIF) or PDF receipts for OCR processing. The extracted data will be available for review and can be converted into a transaction
   - Upload PDF bank statements for tabular data extraction and bulk import of transactions
6. **Settings**: Manage your profile details

## Technologies Used

- **Backend**: Node.js, Express.js, MySQL, JWT for authentication, Multer for file uploads, Joi for validation, Winston for logging
- **Frontend**: React.js, React Router DOM, Axios for API calls, Recharts for charting, Tailwind CSS for styling
- **OCR/PDF Microservice**: Python, FastAPI, PyTesseract, PDFPlumber
