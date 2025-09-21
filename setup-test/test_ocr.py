#!/usr/bin/env python3
"""
Test script for the enhanced OCR functionality
"""

import sys
import os
from pathlib import Path

# Add services to path
# sys.path.insert(0, str(Path(__file__).parent / "services" / "ingest"))

try:
    from services.ingest.main import (
        setup_tesseract, 
        TESSERACT_READY, 
        PYTESSERACT_AVAILABLE,
        is_image_ext,
        is_pdf_ext
    )
    
    print("=== Know-AI OCR Test ===")
    print()
    
    print("1. Import Status:")
    print(f"   ✅ Ingest service imported successfully")
    print(f"   📦 Pytesseract available: {PYTESSERACT_AVAILABLE}")
    print(f"   🔧 Tesseract ready: {TESSERACT_READY}")
    print()
    
    if PYTESSERACT_AVAILABLE:
        try:
            import pytesseract
            version = pytesseract.get_tesseract_version()
            languages = pytesseract.get_languages()
            print(f"2. Tesseract Configuration:")
            print(f"   🔢 Version: {version}")
            print(f"   🌐 Languages: {languages}")
            print(f"   📍 Executable: {getattr(pytesseract.pytesseract, 'tesseract_cmd', 'default')}")
            print()
        except Exception as e:
            print(f"2. Tesseract Configuration Error: {e}")
            print()
    
    print("3. File Type Detection Tests:")
    test_files = [
        "document.pdf",
        "image.jpg", 
        "table.csv",
        "spreadsheet.xlsx",
        "photo.png",
        "scan.tiff"
    ]
    
    for filename in test_files:
        is_pdf = is_pdf_ext(filename)
        is_img = is_image_ext(filename)
        file_type = "PDF" if is_pdf else "Image" if is_img else "Other"
        print(f"   📄 {filename:<15} → {file_type}")
    
    print()
    print("4. Service Status:")
    if TESSERACT_READY:
        print("   ✅ Ready to process PDF and image files with pytesseract OCR")
        print("   🔄 Flow: PDF/Image → Pytesseract OCR → Markdown → Agno Chunking → Vector Storage")
    else:
        print("   ⚠️  OCR functionality limited - install Tesseract-OCR")
        print("   📥 Download from: https://github.com/UB-Mannheim/tesseract/wiki")
    
    print()
    print("=== Test Complete ===")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure all dependencies are installed:")
    print("  pip install PyMuPDF pytesseract pillow numpy")
    
except Exception as e:
    print(f"❌ Test error: {e}")
    import traceback
    traceback.print_exc()