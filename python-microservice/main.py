from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import io
import re
import json
from datetime import datetime
from typing import Optional, Dict, Any
import pytesseract
from PIL import Image
import pdfplumber
from dotenv import load_dotenv

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