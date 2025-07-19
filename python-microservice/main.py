from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import io
import re
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from decimal import Decimal, InvalidOperation
import pytesseract
from PIL import Image
import pdfplumber
from dotenv import load_dotenv
import uvicorn
from pydantic import BaseModel, ValidationError
import PyPDF2
import pdfplumber
import pandas as pd
import camelot
from io import BytesIO

load_dotenv()

app = FastAPI(title="CashMate OCR Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ReceiptParser:
    """Receipt OCR and data extraction utility"""
    
    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> str:
        """Extract text from image using Tesseract OCR"""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Use Tesseract to extract text
            text = pytesseract.image_to_string(image, config='--psm 6')
            return text
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to extract text from image: {str(e)}")
    
    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes) -> str:
        """Extract text from PDF using pdfplumber"""
        try:
            text = ""
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")
    
    @staticmethod
    def parse_amount(text: str) -> Optional[float]:
        """Extract monetary amounts from text"""
        # Common patterns for amounts
        patterns = [
            r'(?:total|amount|sum|subtotal|grand total)[\s:]*[$₹]?\s*(\d+(?:\.\d{2})?)',
            r'[$₹]\s*(\d+(?:\.\d{2})?)',
            r'(\d+\.\d{2})\s*(?:total|amount|sum|subtotal|grand total)',
            r'(?:rs\.?|inr)\s*(\d+(?:\.\d{2})?)',
            r'\b(\d+\.\d{2})\b(?=.*(?:total|amount|paid))',
        ]
        
        amounts = []
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                try:
                    amount = float(match)
                    if 0.01 <= amount <= 99999.99:  # Reasonable amount range
                        amounts.append(amount)
                except ValueError:
                    continue
        
        # Return the highest amount found (likely to be the total)
        return max(amounts) if amounts else None
    
    @staticmethod
    def parse_date(text: str) -> Optional[str]:
        """Extract date from text"""
        patterns = [
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{2,4})',
            r'(?:date|dated)[\s:]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                try:
                    # Try to parse different date formats
                    date_formats = ['%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%m-%d-%Y', '%Y-%m-%d', '%Y/%m/%d']
                    for fmt in date_formats:
                        try:
                            parsed_date = datetime.strptime(match, fmt)
                            return parsed_date.strftime('%Y-%m-%d')
                        except ValueError:
                            continue
                except:
                    continue
        
        return None
    
    @staticmethod
    def parse_vendor(text: str) -> Optional[str]:
        """Extract vendor/merchant name from text"""
        lines = text.strip().split('\n')
        
        # Look for vendor name in first few lines
        for i, line in enumerate(lines[:5]):
            line = line.strip()
            if len(line) > 2 and not re.match(r'^\d+[-/]\d+[-/]\d+', line):
                # Skip common header words
                skip_words = ['receipt', 'invoice', 'bill', 'tax', 'gst', 'date', 'time']
                if not any(word in line.lower() for word in skip_words):
                    # Clean the line
                    vendor = re.sub(r'[^\w\s&\-\.]', '', line).strip()
                    if len(vendor) > 2:
                        return vendor[:50]  # Limit length
        
        # Look for patterns like "Store Name" or "Company Ltd"
        vendor_patterns = [
            r'([A-Z][a-zA-Z\s&\-\.]{3,30}(?:ltd|inc|pvt|corp|company)?)',
            r'(?:store|shop|mart|mall|restaurant|cafe)[\s:]*([A-Za-z\s&\-\.]{3,30})',
        ]
        
        for pattern in vendor_patterns:
            matches = re.findall(pattern, text)
            if matches:
                return matches[0].strip()[:50]
        
        return "Unknown Vendor"
    
    @classmethod
    def process_receipt(cls, file_content: bytes, content_type: str) -> Dict[str, Any]:
        """Main processing function"""
        try:
            # Extract text based on file type
            if content_type.startswith('image/'):
                text = cls.extract_text_from_image(file_content)
            elif content_type == 'application/pdf':
                text = cls.extract_text_from_pdf(file_content)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file type")
            
            # Parse extracted information
            amount = cls.parse_amount(text)
            date = cls.parse_date(text)
            vendor = cls.parse_vendor(text)
            
            return {
                "raw_text": text,
                "extracted_data": {
                    "amount": amount,
                    "date": date,
                    "vendor": vendor,
                    "currency": "INR"  # Default to INR, can be enhanced
                },
                "processing_status": "completed",
                "confidence_score": cls.calculate_confidence(amount, date, vendor)
            }
        
        except Exception as e:
            return {
                "raw_text": "",
                "extracted_data": {
                    "amount": None,
                    "date": None,
                    "vendor": None,
                    "currency": "INR"
                },
                "processing_status": "failed",
                "error": str(e),
                "confidence_score": 0.0
            }
    
    @staticmethod
    def calculate_confidence(amount: Optional[float], date: Optional[str], vendor: Optional[str]) -> float:
        """Calculate confidence score based on extracted data quality"""
        score = 0.0
        
        if amount is not None:
            score += 0.4
        if date is not None:
            score += 0.3
        if vendor is not None and vendor != "Unknown Vendor":
            score += 0.3
        
        return round(score, 2)

@app.get("/")
async def root():
    return {"message": "CashMate OCR Service is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OCR", "version": "1.0.0"}

@app.post("/ocr/receipt")
async def process_receipt(file: UploadFile = File(...)):
    """Process receipt and extract structured data"""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Supported types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    try:
        # Process the receipt
        result = ReceiptParser.process_receipt(file_content, file.content_type)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Receipt processed successfully",
                "filename": file.filename,
                "data": result
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/ocr/batch")
async def process_batch_receipts(files: list[UploadFile] = File(...)):
    """Process multiple receipts in batch"""
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed per batch")
    
    results = []
    
    for file in files:
        try:
            # Validate file type
            allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
            if file.content_type not in allowed_types:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": f"Invalid file type: {file.content_type}"
                })
                continue
            
            file_content = await file.read()
            if len(file_content) > 10 * 1024 * 1024:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": "File size exceeds 10MB limit"
                })
                continue
            
            # Process the receipt
            result = ReceiptParser.process_receipt(file_content, file.content_type)
            
            results.append({
                "filename": file.filename,
                "success": True,
                "data": result
            })
        
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e)
            })
    
    successful = sum(1 for r in results if r["success"])
    
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": f"Batch processing completed. {successful}/{len(files)} files processed successfully.",
            "results": results,
            "summary": {
                "total_files": len(files),
                "successful": successful,
                "failed": len(files) - successful
            }
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    
    
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF Parser Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Transaction(BaseModel):
    date: str
    description: str
    amount: float
    balance: Optional[float] = None
    transaction_type: str  # 'debit' or 'credit'
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

class PDFParser:
    def __init__(self):
        self.common_patterns = {
            'date': [
                r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
                r'\b\d{2,4}[/-]\d{1,2}[/-]\d{1,2}\b',
                r'\b\d{1,2}\s+\w{3}\s+\d{2,4}\b'
            ],
            'amount': [
                r'[\d,]+\.\d{2}',
                r'\b\d+,\d{3}(?:,\d{3})*\.\d{2}\b',
                r'\b\d+\.\d{2}\b'
            ],
            'account_number': [
                r'Account\s*(?:No\.?|Number)\s*:?\s*(\d+)',
                r'A/c\s*(?:No\.?|Number)\s*:?\s*(\d+)',
                r'Account:\s*(\d+)'
            ]
        }
        
    def extract_text_pypdf2(self, pdf_file: BytesIO) -> str:
        """Extract text using PyPDF2"""
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"PyPDF2 extraction failed: {e}")
            return ""

    def extract_tables_pdfplumber(self, pdf_file: BytesIO) -> List[List]:
        """Extract tables using pdfplumber"""
        tables = []
        try:
            pdf_file.seek(0)
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
        except Exception as e:
            logger.error(f"pdfplumber extraction failed: {e}")
        return tables

    def extract_tables_camelot(self, pdf_file: BytesIO) -> List[pd.DataFrame]:
        """Extract tables using camelot"""
        tables = []
        try:
            # Save BytesIO to temporary file for camelot
            temp_path = "/tmp/temp_pdf.pdf"
            pdf_file.seek(0)
            with open(temp_path, "wb") as f:
                f.write(pdf_file.read())
            
            camelot_tables = camelot.read_pdf(temp_path, pages='all', flavor='lattice')
            if not camelot_tables:
                camelot_tables = camelot.read_pdf(temp_path, pages='all', flavor='stream')
            
            for table in camelot_tables:
                if not table.df.empty:
                    tables.append(table.df)
                    
            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
        except Exception as e:
            logger.error(f"Camelot extraction failed: {e}")
        return tables

    def clean_amount(self, amount_str: str) -> Optional[float]:
        """Clean and convert amount string to float"""
        if not amount_str or amount_str.strip() == "":
            return None
            
        try:
            # Remove common currency symbols and spaces
            cleaned = re.sub(r'[₹$€£¥,\s]', '', str(amount_str))
            cleaned = re.sub(r'[^\d.-]', '', cleaned)
            
            if not cleaned:
                return None
                
            # Handle negative amounts in parentheses
            if '(' in str(amount_str) and ')' in str(amount_str):
                cleaned = '-' + cleaned
                
            return float(Decimal(cleaned))
        except (ValueError, InvalidOperation):
            return None

    def parse_date(self, date_str: str) -> Optional[str]:
        """Parse and standardize date"""
        if not date_str:
            return None
            
        date_formats = [
            '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y',
            '%Y/%m/%d', '%Y-%m-%d', '%Y.%m.%d',
            '%d %b %Y', '%d %B %Y',
            '%m/%d/%Y', '%m-%d-%Y'
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        return None

    def identify_transaction_type(self, row_data: List[str], amount: float) -> str:
        """Identify if transaction is credit or debit"""
        row_text = ' '.join(str(cell).lower() for cell in row_data)
        
        credit_indicators = ['credit', 'deposit', 'salary', 'interest', 'refund', '+']
        debit_indicators = ['debit', 'withdrawal', 'payment', 'charge', 'fee', '-']
        
        if any(indicator in row_text for indicator in credit_indicators):
            return 'credit'
        elif any(indicator in row_text for indicator in debit_indicators):
            return 'debit'
        
        # Fallback to amount sign
        return 'credit' if amount > 0 else 'debit'

    def extract_account_info(self, text: str) -> Dict[str, Any]:
        """Extract account information from text"""
        info = {}
        
        # Account number
        for pattern in self.common_patterns['account_number']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info['account_number'] = match.group(1)
                break
        
        # Account holder name
        name_patterns = [
            r'Account\s+Holder\s*:?\s*([A-Za-z\s]+)',
            r'Name\s*:?\s*([A-Za-z\s]+)',
            r'Customer\s+Name\s*:?\s*([A-Za-z\s]+)'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info['account_holder'] = match.group(1).strip()
                break
        
        # Statement period
        period_patterns = [
            r'Statement\s+Period\s*:?\s*([^\n]+)',
            r'From\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+To\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        ]
        
        for pattern in period_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info['statement_period'] = match.group(1).strip()
                break
        
        return info

    def process_table_data(self, tables: List[List]) -> List[Transaction]:
        """Process extracted table data into transactions"""
        transactions = []
        
        for table in tables:
            if not table or len(table) < 2:
                continue
                
            # Skip header row(s)
            data_rows = table[1:] if len(table) > 1 else table
            
            for row in data_rows:
                if not row or len(row) < 3:
                    continue
                    
                # Try to find date, description, and amount in the row
                date_found = None
                description = ""
                amount = None
                balance = None
                
                for i, cell in enumerate(row):
                    cell_str = str(cell).strip()
                    
                    # Check if cell contains a date
                    if not date_found:
                        for pattern in self.common_patterns['date']:
                            if re.search(pattern, cell_str):
                                date_found = self.parse_date(cell_str)
                                break
                    
                    # Check if cell contains an amount
                    if re.match(r'[\d,]+\.\d{2}', cell_str) and not amount:
                        parsed_amount = self.clean_amount(cell_str)
                        if parsed_amount is not None:
                            if amount is None:
                                amount = parsed_amount
                            else:
                                balance = parsed_amount
                    
                    # Build description from non-date, non-amount cells
                    if (not re.match(r'[\d,]+\.\d{2}', cell_str) and 
                        not any(re.search(p, cell_str) for p in self.common_patterns['date'])):
                        if cell_str and cell_str != 'nan':
                            description += f" {cell_str}"
                
                # Create transaction if we have minimum required data
                if date_found and amount is not None:
                    transaction = Transaction(
                        date=date_found,
                        description=description.strip(),
                        amount=abs(amount),
                        balance=balance,
                        transaction_type=self.identify_transaction_type(row, amount)
                    )
                    transactions.append(transaction)
        
        return transactions

    def calculate_summary(self, transactions: List[Transaction]) -> Dict[str, float]:
        """Calculate transaction summary"""
        total_credits = sum(t.amount for t in transactions if t.transaction_type == 'credit')
        total_debits = sum(t.amount for t in transactions if t.transaction_type == 'debit')
        
        return {
            'total_credits': total_credits,
            'total_debits': total_debits,
            'transaction_count': len(transactions)
        }

    def parse_pdf(self, pdf_file: BytesIO) -> ParsedData:
        """Main PDF parsing function"""
        try:
            # Extract text for account information
            text = self.extract_text_pypdf2(pdf_file)
            account_info = self.extract_account_info(text)
            
            # Extract tables using multiple methods
            pdf_file.seek(0)
            tables_pdfplumber = self.extract_tables_pdfplumber(pdf_file)
            
            pdf_file.seek(0)
            tables_camelot = self.extract_tables_camelot(pdf_file)
            
            # Convert camelot DataFrames to lists
            all_tables = tables_pdfplumber
            for df in tables_camelot:
                all_tables.append(df.values.tolist())
            
            # Process transactions
            transactions = self.process_table_data(all_tables)
            
            # Calculate summary
            summary = self.calculate_summary(transactions)
            
            # Create result
            parsed_data = ParsedData(
                account_number=account_info.get('account_number'),
                account_holder=account_info.get('account_holder'),
                statement_period=account_info.get('statement_period'),
                transactions=transactions,
                **summary
            )
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"PDF parsing failed: {e}")
            raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")

# Initialize parser
pdf_parser = PDFParser()

@app.post("/parse-pdf", response_model=ParsedData)
async def parse_pdf_endpoint(file: UploadFile = File(...)):
    """Parse PDF bank statement"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read file content
        content = await file.read()
        pdf_file = BytesIO(content)
        
        # Parse PDF
        result = pdf_parser.parse_pdf(pdf_file)
        
        logger.info(f"Successfully parsed PDF: {file.filename}")
        logger.info(f"Extracted {len(result.transactions)} transactions")
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "pdf-parser"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)