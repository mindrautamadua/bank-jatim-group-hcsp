import 'server-only'
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Penyimpanan evidence kegiatan utama: S3-compatible (Datacomm DObject),
// koneksi sama dengan hcma-assessment. Memakai endpoint + forcePathStyle agar
// kompatibel dengan S3 non-AWS (Datacomm/MinIO/R2).

const ENDPOINT = process.env.S3_ENDPOINT
const BUCKET = process.env.S3_BUCKET
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY
const REGION = process.env.S3_REGION || 'us-east-1'

export function s3Enabled(): boolean {
  return Boolean(ENDPOINT && BUCKET && ACCESS_KEY && SECRET_KEY)
}

let _client: S3Client | null = null
function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: ENDPOINT,
      region: REGION,
      credentials: { accessKeyId: ACCESS_KEY!, secretAccessKey: SECRET_KEY! },
      forcePathStyle: true, // wajib untuk S3-compatible non-AWS (Datacomm/MinIO)
    })
  }
  return _client
}

export async function putEvidenceObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await client().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

// URL sementara (default 5 menit) untuk mengunduh / menampilkan evidence.
export async function presignEvidenceUrl(key: string, filename: string, contentType: string): Promise<string> {
  const safe = filename.replace(/["\\\r\n]/g, '_')
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: `inline; filename="${safe}"`,
      ResponseContentType: contentType,
    }),
    { expiresIn: 300 }
  )
}

export async function deleteEvidenceObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
