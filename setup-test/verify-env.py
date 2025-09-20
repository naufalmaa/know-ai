#!/usr/bin/env python3
"""
Environment Variable Verification Script for Know-AI Project
Run this script to verify that all required environment variables are accessible.
"""

import os
import sys
from pathlib import Path

# Load .env from project root  
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
    print("✓ Successfully loaded .env file")
except ImportError:
    print("⚠️  python-dotenv not installed. Install with: pip install python-dotenv")
except Exception as e:
    print(f"❌ Error loading .env file: {e}")

# Define required environment variables for each service
REQUIRED_ENV_VARS = {
    "Database": [
        "POSTGRES_URL"
    ],
    "Service Ports": [
        "FASTIFY_PORT",
        "INGEST_PORT", 
        "CHAT_PORT",
        "LITELLM_PORT",
        "PORT_WEB"
    ],
    "S3/MinIO Storage": [
        "S3_ENDPOINT",
        "S3_REGION", 
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "S3_BUCKET_RAW",
        "S3_BUCKET_DERIVED"
    ],
    "AI/ML Services": [
        "LITELLM_BASE",
        "LITELLM_API_KEY",
        "RAG_EMBED_MODEL",
        "RAG_GENERATION_MODEL"
    ],
    "External Services": [
        "WEAVIATE_URL",
        "ROLMOCR_URL"
    ],
    "JWT & Security": [
        "JWT_SECRET"
    ],
    "Next.js Frontend": [
        "NEXT_PUBLIC_API_BASE",
        "NEXT_PUBLIC_CHAT_WS"
    ]
}

OPTIONAL_ENV_VARS = {
    "Optional Services": [
        "OPENAI_API_KEY",
        "WEAVIATE_API_KEY", 
        "AGNO_BASE",
        "OLLAMA_BASE"
    ]
}

def check_env_vars():
    """Check if environment variables are set"""
    print("\n" + "="*60)
    print("ENVIRONMENT VARIABLE VERIFICATION")
    print("="*60)
    
    all_good = True
    
    # Check required variables
    print("\n🔍 REQUIRED ENVIRONMENT VARIABLES:")
    for category, vars_list in REQUIRED_ENV_VARS.items():
        print(f"\n📋 {category}:")
        for var in vars_list:
            value = os.getenv(var)
            if value:
                # Mask sensitive values
                if any(secret in var.lower() for secret in ['key', 'secret', 'password', 'token']):
                    display_value = value[:8] + "..." if len(value) > 8 else "***"
                else:
                    display_value = value
                print(f"  ✓ {var} = {display_value}")
            else:
                print(f"  ❌ {var} = NOT SET")
                all_good = False
    
    # Check optional variables
    print(f"\n🔍 OPTIONAL ENVIRONMENT VARIABLES:")
    for category, vars_list in OPTIONAL_ENV_VARS.items():
        print(f"\n📋 {category}:")
        for var in vars_list:
            value = os.getenv(var)
            if value:
                if any(secret in var.lower() for secret in ['key', 'secret', 'password', 'token']):
                    display_value = value[:8] + "..." if len(value) > 8 else "***"
                else:
                    display_value = value
                print(f"  ✓ {var} = {display_value}")
            else:
                print(f"  ⚪ {var} = NOT SET (optional)")
    
    print("\n" + "="*60)
    if all_good:
        print("🎉 ALL REQUIRED ENVIRONMENT VARIABLES ARE SET!")
        print("✅ Your application should be able to start successfully.")
    else:
        print("❌ SOME REQUIRED ENVIRONMENT VARIABLES ARE MISSING!")
        print("💡 Please check your .env file and set the missing variables.")
        
    print("\n📝 Next steps:")
    print("1. If variables are missing, update your .env file")
    print("2. Restart your services after making changes")
    print("3. Run ./dev-all.sh to start all services")
    print("="*60)
    
    return all_good

if __name__ == "__main__":
    success = check_env_vars()
    sys.exit(0 if success else 1)