// PoB2 export code -> XML. Same rules as @poe2/core's decodePobExport (base64url, line breaks and `?` at the ends
// dropped, zlib inflate), kept here so the service has no build step and no dependency on the workspaces.
import { inflateSync } from 'node:zlib'

export class DecodeError extends Error {}

export function decodePobCode(code) {
  if (typeof code !== 'string' || !code.trim()) throw new DecodeError('Empty Path of Building code.')
  const compact = code.trim().replace(/^\?+|\?+$/g, '').replace(/[\r\n\t]+/g, '')
  if (!/^[A-Za-z0-9_\-+/]+={0,2}$/.test(compact)) throw new DecodeError('Code is not valid base64.')
  const b64 = compact.replace(/-/g, '+').replace(/_/g, '/')
  let xml
  try {
    xml = inflateSync(Buffer.from(b64, 'base64'), { maxOutputLength: 8 << 20 }).toString('utf8')
  } catch {
    throw new DecodeError('Code did not inflate: it may be truncated or not a PoB code.')
  }
  if (!xml.includes('<PathOfBuilding2')) throw new DecodeError('Decoded payload is not a Path of Building 2 build.')
  return xml
}
