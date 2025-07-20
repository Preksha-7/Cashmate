from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import io
import re
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from decimal import Decimal, InvalidOperation
import pytesseract
from PIL import Image

# Set tesseract path if needed (Windows)
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
import pdfplumber
import PyPDF2
from io import BytesIO
from pydantic import BaseModel, ValidationError
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="CashMate OCR/PDF Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class Transaction(BaseModel):
    date: str
    description: str
    amount: float
    balance: Optional[float] = None
    transaction_type: str
    category: Optional[str] = None

class ParsedData(BaseModel):
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    statement_period: Optional[str] = None
    opening_balance: Optional[float] = None
    closing_balance: Optional[float] = None
    transactions: List[Transaction] = []
    total_credits: float = 0.0
    total_debits: float = 0.0
    transaction_count: int = 0

# Utility Functions
def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from image using pytesseract"""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        return pytesseract.image_to_string(image, config='--psm 6 --oem 3')
    except Exception as e:
        logger.error(f"Image OCR failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image OCR failed: {e}")

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber"""
    try:
        text = ""
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                if page_text := page.extract_text():
                    text += page_text + "\n"
        return text
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF text extraction failed: {e}")

def parse_amount(text: str) -> Optional[float]:
    """Parse amount from text using multiple patterns"""
    patterns = [
        r'(?:total|amount|sum|subtotal|grand total|bill)[\s:]*[$₹€]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)',
        r'[$₹€]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)',
        r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(?:total|amount)',
        r'(?:rs\.?|inr)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)',
        r'\b(\d+\.\d{2})\b',
        r'\b(\d+)\b'
    ]
    
    amounts = []
    for pattern in patterns:
        for match in re.findall(pattern, text.lower()):
            try:
                amount = float(match.replace(',', ''))
                if 0.01 <= amount <= 100000.00:
                    amounts.append(amount)
            except ValueError:
                continue
    
    return max(amounts) if amounts else None

def parse_date(text: str) -> Optional[str]:
    """Parse date from text with multiple formats"""
    if not text:
        return None
        
    patterns = [
        r'(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})',
        r'(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})',
        r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})',
        r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})',
        r'(\d{1,2}-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*-\d{2,4})'
    ]
    
    formats = [
        '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y/%m/%d', '%Y-%m-%d', '%Y.%m.%d',
        '%d %b %Y', '%d %B %Y', '%b %d, %Y', '%B %d, %Y', '%d-%b-%Y', '%d-%B-%Y',
        '%m/%d/%y', '%m-%d-%y'
    ]
    
    for pattern in patterns:
        for match in re.findall(pattern, text.lower()):
            for fmt in formats:
                try:
                    parsed_date = datetime.strptime(match, fmt)
                    if 2000 <= parsed_date.year <= datetime.now().year + 1:
                        return parsed_date.strftime('%Y-%m-%d')
                except ValueError:
                    continue
    return None

def parse_vendor(text: str) -> str:
    """Extract vendor name from receipt text"""
    lines = text.strip().split('\n')
    vendor_keywords = ['store', 'shop', 'mart', 'restaurant', 'cafe', 'company', 'ltd', 'inc', 'corp', 'pvt', 'co']
    
    for line in lines[:8]:
        line = line.strip()
        if (len(line) > 5 and 
            not re.search(r'\d{4}', line) and
            not re.search(r'tel|phone|fax|gstin|vat|invoice|bill|receipt|date|time', line.lower())):
            if (any(k in line.lower() for k in vendor_keywords) or 
                re.match(r'^[A-Z][a-zA-Z\s&.-]{3,}(?:(?:\s(?:ltd|inc|pvt|corp|co))\.?)?$', line)):
                return re.sub(r'[\(\)\*#]', '', line).strip()[:100]
    
    return "Unknown Vendor"

def calculate_confidence(amount: Optional[float], date: Optional[str], vendor: Optional[str]) -> float:
    """Calculate confidence score based on extracted data"""
    score = 0.0
    if amount is not None:
        score += 0.4
    if date is not None:
        score += 0.3
    if vendor and vendor != "Unknown Vendor" and len(vendor) > 3:
        score += 0.3
    return round(score * 100, 2)

# Receipt Processing Class
class ReceiptProcessor:
    @staticmethod
    def process(file_content: bytes, content_type: str) -> Dict[str, Any]:
        """Process receipt file and extract data"""
        try:
            # Extract text based on file type
            if content_type.startswith('image/'):
                text = extract_text_from_image(file_content)
            elif content_type == 'application/pdf':
                text = extract_text_from_pdf(file_content)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file type")
            
            # Parse extracted data
            amount = parse_amount(text)
            date = parse_date(text)
            vendor = parse_vendor(text)
            
            return {
                "raw_text": text,
                "extracted_data": {
                    "amount": amount,
                    "date": date,
                    "vendor": vendor,
                    "currency": "INR"
                },
                "processing_status": "completed",
                "confidence_score": calculate_confidence(amount, date, vendor)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Receipt processing error: {e}", exc_info=True)
            return {
                "raw_text": "",
                "extracted_data": {"amount": None, "date": None, "vendor": None, "currency": "INR"},
                "processing_status": "failed",
                "error": str(e),
                "confidence_score": 0.0
            }

# PDF Bank Statement Parser
class PDFBankStatementParser:
    def __init__(self):
        self.patterns = {
            'account_number': [r'(?:Account|A/c|Acct)\s*(?:No\.?|Number)?\s*:?\s*(\d{9,18})'],
            'account_holder': [r'(?:Account Holder|Name|Customer Name)\s*:?\s*([A-Za-z\s.]+)'],
            'statement_period': [r'(?:Statement Period|Period|From)\s*(.+?)\s*(?:To|.)\s*(.+)'],
            'opening_balance': [r'(?:Opening Balance|Opening Bal)\s*[:\-\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)'],
            'closing_balance': [r'(?:Closing Balance|Closing Bal)\s*[:\-\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)']
        }

    def clean_amount(self, amount_str: str) -> Optional[float]:
        """Clean and convert amount string to float"""
        if not amount_str or amount_str.strip() == "":
            return None
        
        try:
            cleaned = re.sub(r'[₹$€£¥,]', '', str(amount_str).strip())
            is_negative = cleaned.startswith('(') and cleaned.endswith(')') or cleaned.startswith('-')
            
            if is_negative:
                cleaned = cleaned.strip('()-')
            
            cleaned = re.sub(r'[^\d.]', '', cleaned)
            if not cleaned:
                return None
            
            amount = float(Decimal(cleaned))
            return -amount if is_negative else amount
            
        except (ValueError, InvalidOperation):
            return None

    def extract_account_info(self, text: str) -> Dict[str, Any]:
        """Extract account information from text"""
        info = {}
        
        for key, patterns in self.patterns.items():
            for pattern in patterns:
                if match := re.search(pattern, text, re.IGNORECASE):
                    if key in ['opening_balance', 'closing_balance']:
                        if amount := self.clean_amount(match.group(1)):
                            info[key] = amount
                    elif key == 'statement_period' and len(match.groups()) == 2:
                        start_date = parse_date(match.group(1))
                        end_date = parse_date(match.group(2))
                        if start_date and end_date:
                            info[key] = f"{start_date} to {end_date}"
                    else:
                        info[key] = match.group(1).strip()
                    break
        
        return info

    def extract_tables(self, pdf_file: BytesIO) -> List[List]:
        """Extract tables from PDF using pdfplumber"""
        tables = []
        try:
            pdf_file.seek(0)
            with pdfplumber.open(pdf_file) as pdf:
                table_settings = {
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                    "edge_tolerance": 3
                }
                
                for page in pdf.pages:
                    if page_tables := page.extract_tables(table_settings):
                        tables.extend(page_tables)
        except Exception as e:
            logger.error(f"Table extraction failed: {e}")
        
        return tables

    def process_transactions(self, tables: List[List]) -> List[Transaction]:
        """Process table data into Transaction objects"""
        transactions = []
        
        for table_data in tables:
            if not table_data:
                continue
                
            header = [str(h).lower() for h in table_data[0]]
            
            # Find column indices
            date_idx = next((i for i, h in enumerate(header) if 'date' in h), -1)
            desc_idx = next((i for i, h in enumerate(header) if any(x in h for x in ['description', 'particulars', 'details'])), -1)
            credit_idx = next((i for i, h in enumerate(header) if 'credit' in h or 'deposit' in h), -1)
            debit_idx = next((i for i, h in enumerate(header) if 'debit' in h or 'withdrawal' in h), -1)
            amount_idx = next((i for i, h in enumerate(header) if 'amount' in h and credit_idx == -1 and debit_idx == -1), -1)
            balance_idx = next((i for i, h in enumerate(header) if 'balance' in h or 'bal' in h), -1)
            
            if date_idx == -1 or desc_idx == -1 or (credit_idx == -1 and debit_idx == -1 and amount_idx == -1):
                continue
            
            # Process rows
            for row in table_data[1:]:
                if not row or len(row) <= max(date_idx, desc_idx, credit_idx or 0, debit_idx or 0, amount_idx or 0, balance_idx or 0):
                    continue
                
                # Parse date
                if not (parsed_date := parse_date(str(row[date_idx]).strip())):
                    continue
                
                description = str(row[desc_idx]).strip()
                balance_val = self.clean_amount(str(row[balance_idx]).strip()) if balance_idx != -1 else None
                
                # Determine amount and transaction type
                amount_val = transaction_type = None
                
                if credit_idx != -1 and (amount := self.clean_amount(str(row[credit_idx]))):
                    amount_val, transaction_type = amount, 'credit'
                elif debit_idx != -1 and (amount := self.clean_amount(str(row[debit_idx]))):
                    amount_val, transaction_type = amount, 'debit'
                elif amount_idx != -1 and (amount := self.clean_amount(str(row[amount_idx]))):
                    amount_val = abs(amount)
                    transaction_type = 'credit' if amount >= 0 else 'debit'
                
                if amount_val is None or amount_val == 0:
                    continue
                
                try:
                    transactions.append(Transaction(
                        date=parsed_date,
                        description=description,
                        amount=abs(amount_val),
                        balance=balance_val,
                        transaction_type=transaction_type,
                        category=None
                    ))
                except ValidationError as e:
                    logger.warning(f"Invalid transaction data: {e}")
        
        return transactions

    def parse(self, pdf_file: BytesIO) -> ParsedData:
        """Parse PDF bank statement"""
        try:
            # Extract text for account info
            pdf_file.seek(0)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)
            
            account_info = self.extract_account_info(text)
            
            # Extract tables and process transactions
            tables = self.extract_tables(pdf_file)
            transactions = self.process_transactions(tables)
            
            # Calculate summary
            total_credits = sum(t.amount for t in transactions if t.transaction_type == 'credit')
            total_debits = sum(t.amount for t in transactions if t.transaction_type == 'debit')
            
            return ParsedData(
                account_number=account_info.get('account_number'),
                account_holder=account_info.get('account_holder'),
                statement_period=account_info.get('statement_period'),
                opening_balance=account_info.get('opening_balance'),
                closing_balance=account_info.get('closing_balance'),
                transactions=transactions,
                total_credits=round(total_credits, 2),
                total_debits=round(total_debits, 2),
                transaction_count=len(transactions)
            )
            
        except Exception as e:
            logger.error(f"PDF parsing failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"PDF parsing failed: {e}")

# Initialize processors
receipt_processor = ReceiptProcessor()
pdf_parser = PDFBankStatementParser()

# API Endpoints
@app.get("/")
async def root():
    return {"message": "CashMate OCR/PDF Service is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OCR & PDF Parser", "version": "1.0.0"}

@app.post("/ocr/receipt")
async def process_receipt(file: UploadFile = File(...)):
    """Process single receipt file"""
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "image/webp", "image/heic", "image/heif"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Supported: {', '.join(allowed_types)}")
    
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    try:
        result = receipt_processor.process(file_content, file.content_type)
        return JSONResponse(status_code=200, content={
            "success": True,
            "message": "Receipt processed successfully",
            "filename": file.filename,
            "data": result
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Receipt processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")

@app.post("/ocr/batch")
async def process_batch_receipts(files: list[UploadFile] = File(...)):
    """Process multiple receipt files"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed per batch")
    
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "image/webp", "image/heic", "image/heif"]
    results = []
    
    for file in files:
        try:
            if file.content_type not in allowed_types:
                results.append({"filename": file.filename, "success": False, "error": f"Invalid file type: {file.content_type}"})
                continue
            
            file_content = await file.read()
            if len(file_content) > 10 * 1024 * 1024:
                results.append({"filename": file.filename, "success": False, "error": "File size exceeds 10MB limit"})
                continue
            
            result = receipt_processor.process(file_content, file.content_type)
            results.append({"filename": file.filename, "success": True, "data": result})
            
        except Exception as e:
            logger.error(f"Batch processing error for {file.filename}: {e}")
            results.append({"filename": file.filename, "success": False, "error": str(e)})
    
    successful = sum(1 for r in results if r["success"])
    
    return JSONResponse(status_code=200, content={
        "success": True,
        "message": f"Batch processing completed. {successful}/{len(files)} files processed successfully.",
        "results": results,
        "summary": {"total_files": len(files), "successful": successful, "failed": len(files) - successful}
    })

@app.post("/parse-pdf", response_model=ParsedData)
async def parse_pdf_statement(file: UploadFile = File(...)):
    """Parse PDF bank statement"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        content = await file.read()
        result = pdf_parser.parse(BytesIO(content))
        
        logger.info(f"Successfully parsed PDF: {file.filename}, extracted {len(result.transactions)} transactions")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF processing error for {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)