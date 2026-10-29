export function writeU16Be(buf: Buffer, offset: number, value: number): void {
  buf.writeUInt16BE(value, offset)
}

export function readU16Be(buf: Buffer, offset: number): number {
  return buf.readUInt16BE(offset)
}

export function writeU32Be(buf: Buffer, offset: number, value: number): void {
  buf.writeUInt32BE(value, offset)
}

export function readU32Be(buf: Buffer, offset: number): number {
  return buf.readUInt32BE(offset)
}

export function writeU64Be(buf: Buffer, offset: number, value: number): void {
  const big = BigInt(value)
  buf.writeUInt32BE(Number((big >> 32n) & 0xffffffffn), offset)
  buf.writeUInt32BE(Number(big & 0xffffffffn), offset + 4)
}

export function readU64Be(buf: Buffer, offset: number): number {
  const hi = BigInt(buf.readUInt32BE(offset))
  const lo = BigInt(buf.readUInt32BE(offset + 4))
  const n = Number((hi << 32n) | lo)
  if (!Number.isSafeInteger(n)) {
    throw new RangeError('u64 value exceeds safe integer range')
  }
  return n
}

export function writeUtf8Prefixed(buf: Buffer, offset: number, text: string): number {
  const bytes = Buffer.from(text, 'utf8')
  if (bytes.length > 0xffff) throw new RangeError('utf8 field too long')
  writeU16Be(buf, offset, bytes.length)
  bytes.copy(buf, offset + 2)
  return 2 + bytes.length
}

export function readUtf8Prefixed(buf: Buffer, offset: number): { value: string; next: number } {
  const len = readU16Be(buf, offset)
  const start = offset + 2
  const end = start + len
  if (end > buf.length) throw new RangeError('truncated utf8 field')
  return { value: buf.subarray(start, end).toString('utf8'), next: end }
}
