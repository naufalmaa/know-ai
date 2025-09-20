#!/usr/bin/env node

// MinIO Setup and Test Script
import { S3Client, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('🔧 MinIO Setup and Test');
console.log('======================');

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

async function setupMinIO() {
  try {
    console.log(`📡 Testing connection to MinIO at ${process.env.S3_ENDPOINT}`);
    
    // Test connection by listing buckets
    const listResult = await s3.send(new ListBucketsCommand({}));
    console.log('✅ Successfully connected to MinIO');
    console.log('📂 Existing buckets:', listResult.Buckets?.map(b => b.Name) || []);
    
    // Create required buckets if they don't exist
    const requiredBuckets = [
      process.env.S3_BUCKET_RAW || 'know-ai-raw',
      process.env.S3_BUCKET_DERIVED || 'know-ai-derived'
    ];
    
    const existingBuckets = listResult.Buckets?.map(b => b.Name) || [];
    
    for (const bucketName of requiredBuckets) {
      if (!existingBuckets.includes(bucketName)) {
        console.log(`🪣 Creating bucket: ${bucketName}`);
        try {
          await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
          console.log(`✅ Created bucket: ${bucketName}`);
        } catch (err) {
          if (err.name === 'BucketAlreadyExists' || err.name === 'BucketAlreadyOwnedByYou') {
            console.log(`ℹ️  Bucket ${bucketName} already exists`);
          } else {
            throw err;
          }
        }
      } else {
        console.log(`✅ Bucket ${bucketName} already exists`);
      }
    }
    
    console.log('🎉 MinIO setup completed successfully!');
    console.log('📍 MinIO endpoint:', process.env.S3_ENDPOINT);
    console.log('📂 Buckets ready for use');
    
  } catch (error) {
    console.error('❌ MinIO setup failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure MinIO server is running');
      console.log('2. Check if MinIO is running on the correct port');
      console.log('3. Verify MinIO is accessible at:', process.env.S3_ENDPOINT);
      console.log('\n🚀 To start MinIO server:');
      console.log('   minio server ~/minio-data --address ":9001"');
    }
    
    process.exit(1);
  }
}

setupMinIO();