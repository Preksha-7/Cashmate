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
import pandas as pd
import camelot
from io import BytesIO
from pydantic import BaseModel, ValidationError
from dotenv import load_dotenv # Moved to top

load_dotenv() # Load environment variables at the very beginning

app = FastAPI(title="CashMate OCR/PDF Service", version="1.0.0")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models (moved from bottom for better organization)
class Transaction(BaseModel):
    date: str
    description: str
    amount: float
    balance: Optional[float] = None
    transaction_type: str  # 'debit' or 'credit'
    category: Optional[str] = None # Allow category to be optional from parser

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
            # --psm 6: Assume a single uniform block of text.
            # --oem 3: Use LSTM engine (best accuracy).
            text = pytesseract.image_to_string(image, config='--psm 6 --oem 3')
            return text
        except Exception as e:
            logger.error(f"Failed to extract text from image: {str(e)}")
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
            logger.error(f"Failed to extract text from PDF: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")
    
    @staticmethod
    def parse_amount(text: str) -> Optional[float]:
        """Extract monetary amounts from text"""
        # More robust patterns for amounts, considering various formats
        patterns = [
            r'(?:total|amount|sum|subtotal|grand total|bill)[\s:]*[$₹€]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)', # Handles commas and optional cents
            r'[$₹€]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)',
            r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(?:total|amount|sum|subtotal|grand total)',
            r'\b(?:rs\.?|inr|eur)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)',
            r'\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\b(?=.*(?:total|amount|paid|balance|net))',
            r'\b(\d+\.\d{2})\b', # Simple decimal number
            r'\b(\d+)\b' # Whole numbers as a last resort
        ]
        
        amounts = []
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                try:
                    # Clean the matched string by removing commas, then convert to float
                    cleaned_match = match.replace(',', '')
                    amount = float(cleaned_match)
                    # Filter for plausible amounts (e.g., usually not single digits for total)
                    if 0.01 <= amount <= 100000.00: # Adjusted reasonable range
                        amounts.append(amount)
                except ValueError:
                    continue
        
        # Prioritize larger amounts (more likely to be totals)
        if amounts:
            return max(amounts)
        return None
    
    @staticmethod
    def parse_date(text: str) -> Optional[str]:
        """Extract date from text"""
        # More comprehensive date patterns
        patterns = [
            r'(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})', # DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
            r'(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})', # YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
            r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})', # DD Mon YYYY
            r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})', # Mon DD, YYYY
            r'(\d{1,2}-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*-\d{2,4})' # DD-Mon-YYYY
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                try:
                    # Attempt to parse with common formats, more flexible parsing
                    for fmt in (
                        '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y',
                        '%Y/%m/%d', '%Y-%m-%d', '%Y.%m.%d',
                        '%d %b %Y', '%d %B %Y',
                        '%b %d, %Y', '%B %d, %Y',
                        '%d-%b-%Y', '%d-%B-%Y',
                        '%m/%d/%y', '%m-%d-%y' # Shorter year formats
                    ):
                        try:
                            parsed_date = datetime.strptime(match, fmt)
                            # Basic year validation (e.g., not too far in past/future)
                            if 2000 <= parsed_date.year <= datetime.now().year + 1:
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
        
        # Keywords to help identify vendor lines
        vendor_keywords = ['store', 'shop', 'mart', 'restaurant', 'cafe', 'company', 'ltd', 'inc', 'corp', 'pvt', 'co', 'supermarket']
        
        # Prioritize lines near the top that look like a business name
        for i, line in enumerate(lines[:8]): # Check first 8 lines
            line = line.strip()
            # Heuristic: Avoid lines with too many numbers, dates, or very short lines
            if (len(line) > 5 and
                not re.search(r'\d{4}', line) and # Avoid lines with years
                not re.search(r'tel|phone|fax|gstin|vat|invoice|bill|receipt|date|time', line.lower())):
                
                # If it contains common business words or looks like a name
                if any(k in line.lower() for k in vendor_keywords) or re.match(r'^[A-Z][a-zA-Z\s&.-]{3,}(?:(?:\s(?:ltd|inc|pvt|corp|co))\.?)?$', line):
                    cleaned_vendor = re.sub(r'[\(\)\*#]', '', line).strip() # Remove common non-alphanumeric noise
                    return cleaned_vendor[:100] # Limit length
        
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
        
        except HTTPException: # Re-raise FastAPI HTTPExceptions directly
            raise
        except Exception as e:
            logger.error(f"Error processing receipt: {str(e)}", exc_info=True)
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
        
        # Assign weights
        if amount is not None:
            score += 0.4
        if date is not None:
            score += 0.3
        if vendor is not None and vendor != "Unknown Vendor" and len(vendor) > 3:
            score += 0.3
        
        return round(score * 100, 2) # Return as percentage

class PDFParser:
    def __init__(self):
        # Increased robustness of patterns
        self.common_patterns = {
            'date': [
                r'\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b', # DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
                r'\b\d{2,4}[-/.]\d{1,2}[-/.]\d{1,2}\b', # YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
                r'\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}\b', # DD Mon YYYY
                r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})', # Mon DD, YYYY
                r'(\d{1,2}-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*-\d{2,4})' # DD-Mon-YYYY
            ],
            'amount': [
                r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(?:Cr|Dr|DB|CR)?', # Handles commas and optional cents, Cr/Dr indicators
                r'(?:INR|Rs\.?|EUR|USD|\$|€|₹)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)', # Currency symbols
                r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(-|L|CR|DR|DB)', # Amount followed by +/-/Cr/Dr
            ],
            'account_number': [
                r'(?:Account|A/c|Acct)\s*(?:No\.?|Number)?\s*:?\s*(\d{9,18})', # Common variations and typical length
                r'\b(?:A/C|ACC)\b\s*(\d{9,18})'
            ],
            'account_holder': [
                r'(?:Account Holder|Name|Customer Name)\s*:?\s*([A-Za-z\s.]+)',
                r'(\b[A-Z][a-z]+\s+[A-Z][a-z]+\b)' # Two capitalized words
            ],
            'statement_period': [
                r'(?:Statement Period|Period|From)\s*(.+?)\s*(?:To|.)\s*(.+)',
                r'For the period\s*([^\n]+)'
            ],
            'opening_balance': [
                r'(?:Opening Balance|Opening Bal)\s*[:\-\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)',
            ],
            'closing_balance': [
                r'(?:Closing Balance|Closing Bal)\s*[:\-\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)',
            ],
            'description_keywords': [
                'description', 'particulars', 'transaction details', 'narration'
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
                    # Adjust table settings for better detection
                    table_settings = {
                        "vertical_strategy": "lines", 
                        "horizontal_strategy": "lines",
                        "snap_tolerance": 3,
                        "join_tolerance": 3,
                        "edge_tolerance": 3,
                        "min_words_vertical": 3,
                        "min_words_horizontal": 1
                    }
                    page_tables = page.extract_tables(table_settings)
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
            temp_path = f"/tmp/temp_pdf_{os.getpid()}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.pdf" # Unique temp file
            pdf_file.seek(0)
            with open(temp_path, "wb") as f:
                f.write(pdf_file.read())
            
            # Try both flavors of Camelot
            camelot_tables_lattice = camelot.read_pdf(temp_path, pages='all', flavor='lattice', strip_text=' .', line_scale=40)
            camelot_tables_stream = camelot.read_pdf(temp_path, pages='all', flavor='stream', strip_text=' .', line_scale=40)
            
            # Prioritize lattice if it finds tables
            selected_tables = camelot_tables_lattice if camelot_tables_lattice else camelot_tables_stream

            for table in selected_tables:
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
            # Remove currency symbols, commas, spaces, and potential trailing Cr/Dr
            cleaned = re.sub(r'[₹$€£¥,]', '', str(amount_str).strip())
            # Handle negative amounts indicated by parentheses or leading minus sign
            is_negative = False
            if cleaned.startswith('(') and cleaned.endswith(')'):
                is_negative = True
                cleaned = cleaned[1:-1]
            if cleaned.startswith('-'):
                is_negative = True
                cleaned = cleaned[1:]

            # Remove non-numeric characters except for the decimal point
            cleaned = re.sub(r'[^\d.]', '', cleaned)
            
            if not cleaned:
                return None
            
            # Ensure it's a valid decimal number
            amount = float(Decimal(cleaned))
            return -amount if is_negative else amount
        except (ValueError, InvalidOperation):
            return None

    def parse_date(self, date_str: str) -> Optional[str]:
        """Parse and standardize date"""
        if not date_str:
            return None
            
        date_formats = [
            '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y',
            '%Y/%m/%d', '%Y-%m-%d', '%Y.%m.%d',
            '%d %b %Y', '%d %B %Y', '%d-%b-%Y', '%d-%B-%Y',
            '%b %d, %Y', '%B %d, %Y',
            '%m/%d/%y', '%m-%d-%y'
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                # Simple year validation to avoid parsing unrelated numbers as years
                if 2000 <= dt.year <= datetime.now().year + 1:
                    return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        return None

    def identify_transaction_type(self, row_data: List[str], amount: float) -> str:
        """Identify if transaction is credit or debit based on keywords and amount sign"""
        row_text = ' '.join(str(cell).lower() for cell in row_data)
        
        credit_indicators = ['credit', 'deposit', 'sal', 'interest', 'refund', 'cr', 'recieved']
        debit_indicators = ['debit', 'withdrawal', 'payment', 'charge', 'fee', 'dr', 'paid']
        
        # Check for explicit indicators in the row first
        if any(indicator in row_text for indicator in credit_indicators):
            return 'credit'
        if any(indicator in row_text for indicator in debit_indicators):
            return 'debit'
        
        # Fallback to amount sign (if amount parsing is accurate for negative numbers)
        return 'credit' if amount >= 0 else 'debit'

    def extract_account_info(self, text: str) -> Dict[str, Any]:
        """Extract account information from text"""
        info = {}
        
        # Account number
        for pattern in self.common_patterns['account_number']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info['account_number'] = match.group(1).strip()
                break
        
        # Account holder name
        for pattern in self.common_patterns['account_holder']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info['account_holder'] = match.group(1).strip()
                break
        
        # Statement period
        for pattern in self.common_patterns['statement_period']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if len(match.groups()) == 2:
                    start_date = self.parse_date(match.group(1))
                    end_date = self.parse_date(match.group(2))
                    if start_date and end_date:
                        info['statement_period'] = f"{start_date} to {end_date}"
                else:
                    info['statement_period'] = match.group(1).strip()
                break
        
        # Opening and Closing Balance
        for bal_type, patterns in [('opening_balance', self.common_patterns['opening_balance']),
                                   ('closing_balance', self.common_patterns['closing_balance'])]:
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    amount = self.clean_amount(match.group(1))
                    if amount is not None:
                        info[bal_type] = amount
                        break
        
        return info

    def process_table_data(self, tables: List[List]) -> List[Transaction]:
        """Process extracted table data into transactions"""
        transactions = []
        for table_data in tables:
            # Attempt to find columns for date, description, amount, and balance
            header = table_data[0] if table_data else []
            
            date_col_idx = -1
            desc_col_idx = -1
            credit_col_idx = -1
            debit_col_idx = -1
            amount_col_idx = -1 # For single amount column if Cr/Dr is in description
            balance_col_idx = -1

            # Identify columns based on common headers
            for i, h in enumerate(header):
                h_lower = str(h).lower()
                if 'date' in h_lower or 'trans date' in h_lower:
                    date_col_idx = i
                elif 'description' in h_lower or 'particulars' in h_lower or 'details' in h_lower:
                    desc_col_idx = i
                elif 'credit' in h_lower or 'deposit' in h_lower:
                    credit_col_idx = i
                elif 'debit' in h_lower or 'withdrawal' in h_lower:
                    debit_col_idx = i
                elif 'amount' in h_lower and amount_col_idx == -1: # Prioritize specific Cr/Dr columns
                    amount_col_idx = i
                elif 'balance' in h_lower or 'bal' in h_lower:
                    balance_col_idx = i
            
            # If crucial columns are not found, skip this table
            if date_col_idx == -1 or desc_col_idx == -1 or (credit_col_idx == -1 and debit_col_idx == -1 and amount_col_idx == -1):
                logger.warning(f"Skipping table due to missing crucial columns in header: {header}")
                continue

            for row in table_data[1:]: # Skip header row
                if not row or len(row) <= max(date_col_idx, desc_col_idx, credit_col_idx, debit_col_idx, amount_col_idx, balance_col_idx):
                    continue # Skip malformed rows
                
                date_str = str(row[date_col_idx]).strip() if date_col_idx != -1 else None
                description_str = str(row[desc_col_idx]).strip() if desc_col_idx != -1 else ""
                
                parsed_date = self.parse_date(date_str)
                if not parsed_date:
                    continue # Skip if date cannot be parsed reliably

                amount_val = None
                transaction_type = None
                
                # Handle credit/debit columns first
                if credit_col_idx != -1 and self.clean_amount(str(row[credit_col_idx])) is not None:
                    amount_val = self.clean_amount(str(row[credit_col_idx]))
                    transaction_type = 'credit'
                elif debit_col_idx != -1 and self.clean_amount(str(row[debit_col_idx])) is not None:
                    amount_val = self.clean_amount(str(row[debit_col_idx]))
                    transaction_type = 'debit'
                elif amount_col_idx != -1 and self.clean_amount(str(row[amount_col_idx])) is not None:
                    # Fallback to general amount column if Cr/Dr columns are not present or empty
                    amount_val = self.clean_amount(str(row[amount_col_idx]))
                    # Try to determine type from description or by amount sign
                    transaction_type = self.identify_transaction_type(row, amount_val)

                if amount_val is None:
                    continue # Skip if no valid amount found

                balance_val = self.clean_amount(str(row[balance_col_idx]).strip()) if balance_col_idx != -1 else None
                
                # Basic validation for amount
                if amount_val == 0.0:
                    continue

                try:
                    transaction = Transaction(
                        date=parsed_date,
                        description=description_str,
                        amount=abs(amount_val), # Store absolute amount
                        balance=balance_val,
                        transaction_type=transaction_type,
                        category=None # Let Node.js service determine category initially
                    )
                    transactions.append(transaction)
                except ValidationError as e:
                    logger.warning(f"Skipping row due to Pydantic validation error: {e.errors()} - Row: {row}")
                    
        return transactions

    def calculate_summary(self, transactions: List[Transaction], account_info: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate transaction summary"""
        total_credits = sum(t.amount for t in transactions if t.transaction_type == 'credit')
        total_debits = sum(t.amount for t in transactions if t.transaction_type == 'debit')
        
        summary = {
            'total_credits': round(total_credits, 2),
            'total_debits': round(total_debits, 2),
            'transaction_count': len(transactions)
        }
        
        # Add opening/closing balances from extracted info if not None
        if account_info.get('opening_balance') is not None:
            summary['opening_balance'] = account_info['opening_balance']
        if account_info.get('closing_balance') is not None:
            summary['closing_balance'] = account_info['closing_balance']
        
        return summary

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
            
            # Combine tables, convert camelot DataFrames to lists
            all_raw_tables = tables_pdfplumber
            for df in tables_camelot:
                all_raw_tables.append(df.values.tolist())
            
            # Process transactions
            transactions = self.process_table_data(all_raw_tables)
            
            # Calculate summary
            summary = self.calculate_summary(transactions, account_info)
            
            # Create result
            parsed_data = ParsedData(
                account_number=account_info.get('account_number'),
                account_holder=account_info.get('account_holder'),
                statement_period=account_info.get('statement_period'),
                transactions=transactions,
                **summary
            )
            
            return parsed_data
            
        except HTTPException: # Re-raise FastAPI HTTPExceptions directly
            raise
        except Exception as e:
            logger.error(f"PDF parsing failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")

# Initialize parsers
receipt_parser_instance = ReceiptParser()
pdf_parser_instance = PDFParser()

@app.get("/")
async def root():
    return {"message": "CashMate OCR/PDF Service is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OCR & PDF Parser", "version": "1.0.0"}

@app.post("/ocr/receipt")
async def process_receipt_endpoint(file: UploadFile = File(...)):
    """Process receipt image/PDF and extract structured data"""
    
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "image/webp", "image/heic", "image/heif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Supported types: {', '.join(allowed_types)}"
        )
    
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    try:
        result = receipt_parser_instance.process_receipt(file_content, file.content_type)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Receipt processed successfully",
                "filename": file.filename,
                "data": result # Nest result under 'data' as expected by Node.js
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing receipt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/ocr/batch")
async def process_batch_receipts_endpoint(files: list[UploadFile] = File(...)):
    """Process multiple receipts in batch"""
    
    if len(files) > 10: # Limit increased to 10 for batch
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed per batch")
    
    results = []
    
    for file in files:
        try:
            allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "image/webp", "image/heic", "image/heif"]
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
            
            result = receipt_parser_instance.process_receipt(file_content, file.content_type)
            
            results.append({
                "filename": file.filename,
                "success": True,
                "data": result # Nest result under 'data'
            })
        
        except Exception as e:
            logger.error(f"Error processing batch file {file.filename}: {str(e)}", exc_info=True)
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

@app.post("/parse-pdf", response_model=ParsedData)
async def parse_pdf_endpoint(file: UploadFile = File(...)):
    """Parse PDF bank statement"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        content = await file.read()
        pdf_file = BytesIO(content)
        
        result = pdf_parser_instance.parse_pdf(pdf_file)
        
        logger.info(f"Successfully parsed PDF: {file.filename}")
        logger.info(f"Extracted {len(result.transactions)} transactions")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Ensure uvicorn runs only when main.py is executed directly
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)